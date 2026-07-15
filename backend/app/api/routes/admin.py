"""Super-admin routes: platform-wide visibility and management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routes.pagination import build_page, paginate
from app.core.database import get_db
from app.core.deps import require_super_admin
from app.core.security import create_access_token, create_refresh_token
from app.models.agent import Agent
from app.models.audit_log import AuditLog
from app.models.call import Call
from app.models.enums import AccountStatus, PlanTier, SubscriptionStatus, UserRole
from app.models.integration import Integration
from app.models.knowledge_base import KnowledgeBaseDocument
from app.models.phone_number import PhoneNumber
from app.models.plan_override import PlanOverride
from app.models.squad import Squad
from app.models.subscription import Subscription
from app.models.tenant_integration import TenantIntegrationEntitlement
from app.models.tool import AgentTool
from app.models.user import User
from app.schemas.admin import (
    AdminUserRow,
    AuditLogPublic,
    CreditPurchase,
    PlatformCredits,
    PlatformSettingsUpdate,
    PlatformStats,
    ProviderBalance,
    ProviderBalanceUpdate,
    SyncResult,
    TenantCreditUpdate,
)
from app.schemas.billing import PlanAdminInfo, PlanUpdate
from app.schemas.analytics import AnalyticsResponse
from app.schemas.auth import AuthResponse, TokenPair, UserPublic
from app.schemas.call import CallPublic
from app.schemas.common import Message, Page
from app.schemas.knowledge_base import DocumentPublic
from app.schemas.integration import (
    IntegrationConnect,
    IntegrationPublic,
    ProviderCategory,
    ProviderInfo,
    TenantIntegrationsUpdate,
    TenantProviderEntitlement,
)
from app.schemas.phone_number import (
    AdminPhoneNumberProvision,
    AdminPhoneNumberReassign,
    PhoneNumberProvision,
    PhoneNumberPublic,
)
from app.schemas.squad import SquadMember, SquadPublic
from app.schemas.tool import ToolPublic
from app.services.analytics import aggregate_analytics
from app.services.audit import record_audit
from app.services.billing import activate_plan, ensure_subscription
from app.services.email import email_service
from app.services.credits import (
    adjust_tenant_credits,
    get_platform_settings,
    get_provider_balance_status,
    purchase_credits,
    set_provider_balance,
    set_tenant_credit_limit,
    update_platform_settings,
)
from app.services.integrations import (
    CATALOG_BY_ID,
    CATEGORY_ORDER,
    PROVIDER_CATALOG,
    admin_tenant_entitlements,
    connected_provider_ids,
)
from app.services.phone_numbers import provision_phone_number
from app.services.plans import effective_plan_admin, effective_plan_info, list_effective_plans
from app.services.voice import voice_provider
from app.services import vapi_sync

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=PlatformStats)
def platform_stats(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    total_customers = db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)
    ) or 0
    total_agents = db.scalar(select(func.count(Agent.id))) or 0
    total_calls = db.scalar(select(func.count(Call.id))) or 0
    total_seconds = db.scalar(select(func.coalesce(func.sum(Call.duration_seconds), 0))) or 0
    total_cost = db.scalar(select(func.coalesce(func.sum(Call.cost), 0.0))) or 0.0
    active_subs = db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.status == SubscriptionStatus.ACTIVE
        )
    ) or 0

    # Rough MRR estimate from active subscriptions.
    revenue = 0.0
    subs = db.scalars(
        select(Subscription).where(Subscription.status == SubscriptionStatus.ACTIVE)
    ).all()
    for s in subs:
        info = effective_plan_info(db, s.plan)
        if info:
            revenue += info.price_usd

    return PlatformStats(
        total_customers=total_customers,
        total_agents=total_agents,
        total_calls=total_calls,
        total_minutes=round(total_seconds / 60, 2),
        total_revenue_estimate=round(revenue, 2),
        total_cost=round(float(total_cost), 2),
        active_subscriptions=active_subs,
    )


@router.get("/customers", response_model=Page[AdminUserRow])
def list_customers(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    stmt = select(User).where(User.role == UserRole.CUSTOMER)
    if search:
        like = f"%{search}%"
        stmt = stmt.where((User.email.ilike(like)) | (User.name.ilike(like)))
    stmt = stmt.order_by(User.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)

    user_ids = [u.id for u in rows]
    agent_counts: dict[str, int] = {}
    call_counts: dict[str, int] = {}
    total_costs: dict[str, float] = {}
    total_seconds: dict[str, int] = {}
    subs_by_user: dict[str, Subscription] = {}

    if user_ids:
        for uid, cnt in db.execute(
            select(Agent.user_id, func.count(Agent.id))
            .where(Agent.user_id.in_(user_ids))
            .group_by(Agent.user_id)
        ).all():
            agent_counts[uid] = cnt

        for uid, cnt, cost, secs in db.execute(
            select(
                Call.user_id,
                func.count(Call.id),
                func.coalesce(func.sum(Call.cost), 0.0),
                func.coalesce(func.sum(Call.duration_seconds), 0),
            )
            .where(Call.user_id.in_(user_ids))
            .group_by(Call.user_id)
        ).all():
            call_counts[uid] = cnt
            total_costs[uid] = float(cost)
            total_seconds[uid] = int(secs)

        subs_by_user = {
            s.user_id: s
            for s in db.scalars(
                select(Subscription).where(Subscription.user_id.in_(user_ids))
            ).all()
        }

    items: list[AdminUserRow] = []
    for u in rows:
        sub = subs_by_user.get(u.id)
        row = AdminUserRow.model_validate(u)
        row.agent_count = agent_counts.get(u.id, 0)
        row.call_count = call_counts.get(u.id, 0)
        row.total_cost = round(total_costs.get(u.id, 0.0), 4)
        row.minutes_used = round(total_seconds.get(u.id, 0) / 60, 1)
        row.plan = sub.plan if sub else None
        if sub:
            row.credit_limit = sub.credit_limit
            row.credits_used = sub.credits_used
            row.topup_credits = sub.topup_credits
            row.credits_remaining = sub.credits_remaining
        items.append(row)
    return build_page(items, total, page, page_size)


def _owner_map(db: Session, user_ids) -> dict[str, User]:
    """Batch-load owners to avoid N+1 lookups in cross-tenant lists."""
    ids = {uid for uid in user_ids if uid}
    if not ids:
        return {}
    return {u.id: u for u in db.scalars(select(User).where(User.id.in_(ids))).all()}


@router.get("/calls", response_model=Page[CallPublic])
def all_calls(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    stmt = select(Call)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            (Call.caller_number.ilike(like)) | (Call.callee_number.ilike(like))
        )
    stmt = stmt.order_by(Call.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    owners = _owner_map(db, (c.user_id for c in rows))
    items = []
    for c in rows:
        data = CallPublic.model_validate(c)
        data.agent_name = c.agent.name if c.agent else None
        owner = owners.get(c.user_id)
        if owner:
            data.owner_name = owner.name
            data.owner_email = owner.email
        items.append(data)
    return build_page(items, total, page, page_size)


@router.get("/agents", response_model=Page[dict])
def all_agents(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    stmt = select(Agent)
    if search:
        stmt = stmt.where(Agent.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(Agent.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    owners = _owner_map(db, (a.user_id for a in rows))
    items = []
    for a in rows:
        owner = owners.get(a.user_id)
        items.append({
            "id": a.id,
            "name": a.name,
            "user_id": a.user_id,
            "owner_name": owner.name if owner else None,
            "owner_email": owner.email if owner else None,
            "status": a.status.value,
            "voice_id": a.voice_id,
            "model": a.model,
            "is_provisioned": bool(a.vapi_assistant_id),
            "created_at": a.created_at.isoformat(),
        })
    return build_page(items, total, page, page_size)


@router.get("/phone-numbers", response_model=Page[PhoneNumberPublic])
def all_phone_numbers(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    stmt = select(PhoneNumber)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            (PhoneNumber.e164_number.ilike(like)) | (PhoneNumber.label.ilike(like))
        )
    stmt = stmt.order_by(PhoneNumber.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    owners = _owner_map(db, (p.user_id for p in rows))
    items = []
    for p in rows:
        data = PhoneNumberPublic.model_validate(p)
        owner = owners.get(p.user_id)
        if owner:
            data.owner_name = owner.name
            data.owner_email = owner.email
        items.append(data)
    return build_page(items, total, page, page_size)


@router.get("/tools", response_model=Page[ToolPublic])
def all_tools(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    stmt = select(AgentTool)
    if search:
        stmt = stmt.where(AgentTool.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(AgentTool.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    agent_ids = {t.agent_id for t in rows if t.agent_id}
    agents = {
        a.id: a
        for a in db.scalars(select(Agent).where(Agent.id.in_(agent_ids))).all()
    } if agent_ids else {}
    owners = _owner_map(db, (agents[t.agent_id].user_id for t in rows if t.agent_id in agents))
    items = []
    for t in rows:
        data = ToolPublic.model_validate(t)
        agent = agents.get(t.agent_id)
        if agent:
            data.agent_name = agent.name
            owner = owners.get(agent.user_id)
            if owner:
                data.owner_name = owner.name
                data.owner_email = owner.email
        items.append(data)
    return build_page(items, total, page, page_size)


@router.get("/squads", response_model=Page[SquadPublic])
def all_squads(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    stmt = select(Squad)
    if search:
        stmt = stmt.where(Squad.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(Squad.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    owners = _owner_map(db, (s.user_id for s in rows))
    # Batch-load member agents for name resolution.
    all_agent_ids: set[str] = set()
    for s in rows:
        all_agent_ids.update(s.member_agent_ids or [])
    agents = {
        a.id: a
        for a in db.scalars(select(Agent).where(Agent.id.in_(all_agent_ids))).all()
    } if all_agent_ids else {}
    items = []
    for s in rows:
        data = SquadPublic.model_validate(s)
        data.is_provisioned = s.is_provisioned
        data.members = [
            SquadMember(
                agent_id=aid,
                agent_name=agents[aid].name if aid in agents else None,
                is_provisioned=bool(agents[aid].vapi_assistant_id) if aid in agents else False,
            )
            for aid in (s.member_agent_ids or [])
        ]
        owner = owners.get(s.user_id)
        if owner:
            data.owner_name = owner.name
            data.owner_email = owner.email
        items.append(data)
    return build_page(items, total, page, page_size)


@router.get("/knowledge-base", response_model=Page[DocumentPublic])
def all_documents(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    stmt = select(KnowledgeBaseDocument)
    if search:
        stmt = stmt.where(KnowledgeBaseDocument.file_name.ilike(f"%{search}%"))
    stmt = stmt.order_by(KnowledgeBaseDocument.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    owners = _owner_map(db, (d.user_id for d in rows))
    items = []
    for d in rows:
        data = DocumentPublic.model_validate(d)
        owner = owners.get(d.user_id)
        if owner:
            data.owner_name = owner.name
            data.owner_email = owner.email
        items.append(data)
    return build_page(items, total, page, page_size)


@router.get("/analytics", response_model=AnalyticsResponse)
def platform_analytics(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Platform-wide analytics across every tenant (mirrors tenant analytics)."""
    return aggregate_analytics(db, scope=None, days=days)


# ── Sync from the voice provider (Vapi) ─────────────────────────────────────
@router.post("/sync/agents", response_model=SyncResult)
async def sync_agents(admin: User = Depends(require_super_admin),
                      db: Session = Depends(get_db)):
    res = await vapi_sync.sync_agents(db, admin.id)
    record_audit(db, user_id=admin.id, action="admin.sync.agents",
                 resource_type="platform", detail=res.as_dict())
    return SyncResult(agents=res.as_dict())


@router.post("/sync/calls", response_model=SyncResult)
async def sync_calls(admin: User = Depends(require_super_admin),
                     db: Session = Depends(get_db)):
    res = await vapi_sync.sync_calls(db, admin.id, allow_unmapped_fallback=True)
    record_audit(db, user_id=admin.id, action="admin.sync.calls",
                 resource_type="platform", detail=res.as_dict())
    return SyncResult(calls=res.as_dict())


@router.post("/sync/integrations", response_model=SyncResult)
async def sync_integrations(admin: User = Depends(require_super_admin),
                            db: Session = Depends(get_db)):
    res = await vapi_sync.sync_integrations(db)
    record_audit(db, user_id=admin.id, action="admin.sync.integrations",
                 resource_type="platform", detail=res.as_dict())
    return SyncResult(integrations=res.as_dict())


@router.post("/sync/all", response_model=SyncResult)
async def sync_all(admin: User = Depends(require_super_admin),
                   db: Session = Depends(get_db)):
    summary = await vapi_sync.sync_all(db, admin.id)
    record_audit(db, user_id=admin.id, action="admin.sync.all",
                 resource_type="platform", detail=summary)
    return SyncResult(**summary)


def _get_customer(user_id: str, db: Session) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/customers/{user_id}/suspend", response_model=Message)
def suspend_customer(user_id: str, admin: User = Depends(require_super_admin),
                     db: Session = Depends(get_db)):
    user = _get_customer(user_id, db)
    user.status = AccountStatus.SUSPENDED
    db.commit()
    record_audit(db, user_id=admin.id, action="admin.suspend", resource_type="user",
                 resource_id=user_id)
    return Message(detail="Account suspended")


@router.post("/customers/{user_id}/activate", response_model=Message)
def activate_customer(user_id: str, admin: User = Depends(require_super_admin),
                      db: Session = Depends(get_db)):
    user = _get_customer(user_id, db)
    user.status = AccountStatus.ACTIVE
    db.commit()
    record_audit(db, user_id=admin.id, action="admin.activate", resource_type="user",
                 resource_id=user_id)
    return Message(detail="Account activated")


@router.post("/customers/{user_id}/plan/{plan}", response_model=Message)
def set_customer_plan(user_id: str, plan: PlanTier,
                      admin: User = Depends(require_super_admin),
                      db: Session = Depends(get_db)):
    _get_customer(user_id, db)
    activate_plan(db, user_id, plan)
    record_audit(db, user_id=admin.id, action="admin.set_plan", resource_type="subscription",
                 resource_id=user_id, detail={"plan": plan.value})
    return Message(detail=f"Plan set to {plan.value}")


@router.post("/customers/{user_id}/impersonate", response_model=AuthResponse)
def impersonate_customer(user_id: str, admin: User = Depends(require_super_admin),
                         db: Session = Depends(get_db)):
    """Issue tokens to act as a customer ("view as user"). Super-admin only."""
    user = _get_customer(user_id, db)
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Cannot impersonate another admin")

    tokens = TokenPair(
        access_token=create_access_token(user.id, user.role.value, impersonated_by=admin.id),
        refresh_token=create_refresh_token(user.id),
    )
    record_audit(db, user_id=admin.id, action="admin.impersonate", resource_type="user",
                 resource_id=user_id, detail={"target_email": user.email})
    return AuthResponse(user=UserPublic.model_validate(user), tokens=tokens)


def _enrich_logs(db: Session, rows) -> list[AuditLogPublic]:
    # Batch-load actors to attach name/email without N+1 per row.
    actor_ids = {r.user_id for r in rows if r.user_id}
    actors: dict[str, User] = {}
    if actor_ids:
        for u in db.scalars(select(User).where(User.id.in_(actor_ids))).all():
            actors[u.id] = u
    items: list[AuditLogPublic] = []
    for r in rows:
        item = AuditLogPublic.model_validate(r)
        actor = actors.get(r.user_id) if r.user_id else None
        if actor:
            item.actor_name = actor.name
            item.actor_email = actor.email
        items.append(item)
    return items


@router.get("/audit-logs", response_model=Page[AuditLogPublic])
def system_logs(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    action: str | None = None,
    user_id: str | None = None,
    search: str | None = None,
):
    """Platform-wide system log across all tenants."""
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            (AuditLog.action.ilike(like))
            | (AuditLog.resource_type.ilike(like))
            | (AuditLog.resource_id.ilike(like))
        )
    stmt = stmt.order_by(AuditLog.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    return build_page(_enrich_logs(db, rows), total, page, page_size)


# ── Provider integrations ───────────────────────────────────────────────────
@router.get("/integrations", response_model=list[ProviderCategory])
def list_integrations(
    _: User = Depends(require_super_admin), db: Session = Depends(get_db)
):
    """Full provider catalog grouped by category, with connection status."""
    connected = {i.provider: i for i in db.scalars(select(Integration)).all()}
    grouped: dict[str, list[ProviderInfo]] = {}
    for spec in PROVIDER_CATALOG:
        existing = connected.get(spec.id)
        info = ProviderInfo(
            id=spec.id,
            name=spec.name,
            description=spec.description,
            category=spec.category,
            auth_type=spec.auth_type,
            connected=existing is not None,
            masked_key=existing.masked_key if existing else None,
            label=existing.label if existing else None,
        )
        grouped.setdefault(spec.category, []).append(info)

    ordered: list[ProviderCategory] = []
    for category in CATEGORY_ORDER:
        if category in grouped:
            ordered.append(ProviderCategory(category=category, providers=grouped[category]))
    # Any categories not in the explicit order go last.
    for category, providers in grouped.items():
        if category not in CATEGORY_ORDER:
            ordered.append(ProviderCategory(category=category, providers=providers))
    return ordered


@router.put("/integrations/{provider_id}", response_model=IntegrationPublic)
async def connect_integration(
    provider_id: str,
    payload: IntegrationConnect,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Connect (or update) a provider by storing its API key with the infra layer."""
    spec = CATALOG_BY_ID.get(provider_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Unknown provider")

    credential_id = await voice_provider.create_credential(
        spec.infra_provider, payload.api_key, name=payload.label or spec.name
    )
    masked = f"••••{payload.api_key[-4:]}" if len(payload.api_key) >= 4 else "••••"

    integration = db.scalar(select(Integration).where(Integration.provider == provider_id))
    if integration:
        # Replace the previous upstream credential if we're updating the key.
        if integration.vapi_credential_id and integration.vapi_credential_id != credential_id:
            await voice_provider.delete_credential(integration.vapi_credential_id)
        integration.label = payload.label
        integration.masked_key = masked
        integration.vapi_credential_id = credential_id
        integration.status = "connected"
    else:
        integration = Integration(
            provider=provider_id,
            category=spec.category,
            label=payload.label,
            masked_key=masked,
            vapi_credential_id=credential_id,
            status="connected",
        )
        db.add(integration)
    db.commit()
    db.refresh(integration)
    record_audit(db, user_id=admin.id, action="admin.integration.connect",
                 resource_type="integration", resource_id=provider_id)
    return IntegrationPublic.model_validate(integration)


@router.delete("/integrations/{provider_id}", response_model=Message)
async def disconnect_integration(
    provider_id: str,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    integration = db.scalar(select(Integration).where(Integration.provider == provider_id))
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not connected")
    if integration.vapi_credential_id:
        await voice_provider.delete_credential(integration.vapi_credential_id)
    db.delete(integration)
    db.commit()
    record_audit(db, user_id=admin.id, action="admin.integration.disconnect",
                 resource_type="integration", resource_id=provider_id)
    return Message(detail="Integration disconnected")


# ── Platform credit pool ────────────────────────────────────────────────────
def _platform_credits(db: Session) -> PlatformCredits:
    s = get_platform_settings(db)
    allocated = db.scalar(
        select(
            func.coalesce(func.sum(Subscription.credit_limit), 0)
            + func.coalesce(func.sum(Subscription.topup_credits), 0)
        )
    ) or 0.0
    remaining = s.credits_remaining
    return PlatformCredits(
        credits_purchased=round(s.credits_purchased, 2),
        credits_used=round(s.credits_used, 2),
        credits_remaining=round(remaining, 2),
        minutes_per_credit=s.minutes_per_credit,
        enforce_pool=s.enforce_pool,
        low_balance_threshold=s.low_balance_threshold,
        minutes_remaining=round(remaining * s.minutes_per_credit, 2),
        credits_allocated=round(float(allocated), 2),
        is_low=(
            s.low_balance_threshold > 0 and remaining <= s.low_balance_threshold
        ),
    )


@router.get("/platform/credits", response_model=PlatformCredits)
def platform_credits(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return _platform_credits(db)


@router.post("/platform/credits/purchase", response_model=PlatformCredits)
def buy_platform_credits(
    payload: CreditPurchase,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    purchase_credits(db, payload.amount)
    record_audit(db, user_id=admin.id, action="admin.credits.purchase",
                 resource_type="platform", detail={"amount": payload.amount})
    return _platform_credits(db)


@router.get("/platform/provider-balance", response_model=ProviderBalance)
def provider_balance(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    """Estimated Vapi wallet balance = admin-entered balance − real call spend since."""
    return ProviderBalance(**get_provider_balance_status(db))


@router.put("/platform/provider-balance", response_model=ProviderBalance)
def update_provider_balance(
    payload: ProviderBalanceUpdate,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    set_provider_balance(db, payload.balance, payload.currency)
    record_audit(db, user_id=admin.id, action="admin.provider_balance",
                 resource_type="platform",
                 detail={"balance": payload.balance, "currency": payload.currency})
    return ProviderBalance(**get_provider_balance_status(db))


@router.patch("/platform/settings", response_model=PlatformCredits)
def patch_platform_settings(
    payload: PlatformSettingsUpdate,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    update_platform_settings(db, **payload.model_dump(exclude_none=True))
    record_audit(db, user_id=admin.id, action="admin.platform.settings",
                 resource_type="platform", detail=payload.model_dump(exclude_none=True))
    return _platform_credits(db)


@router.post("/customers/{user_id}/credits", response_model=AdminUserRow)
def update_tenant_credits(
    user_id: str,
    payload: TenantCreditUpdate,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Override a tenant's monthly allowance and/or grant a persistent top-up."""
    user = _get_customer(user_id, db)
    sub = ensure_subscription(db, user_id)
    if payload.credit_limit is not None:
        set_tenant_credit_limit(db, sub, payload.credit_limit)
    if payload.add_topup:
        adjust_tenant_credits(db, sub, payload.add_topup)
    db.refresh(sub)
    if payload.add_topup:
        email_service.send_credits_added(
            to=user.email,
            name=user.name,
            credits=f"{payload.add_topup:g}",
            new_balance=f"{sub.credits_remaining:g}",
        )
    record_audit(db, user_id=admin.id, action="admin.tenant.credits",
                 resource_type="subscription", resource_id=user_id,
                 detail=payload.model_dump(exclude_none=True))

    agent_count = db.scalar(
        select(func.count(Agent.id)).where(Agent.user_id == user_id)
    ) or 0
    call_count = db.scalar(
        select(func.count(Call.id)).where(Call.user_id == user_id)
    ) or 0
    row = AdminUserRow.model_validate(user)
    row.agent_count = agent_count
    row.call_count = call_count
    row.plan = sub.plan
    row.credit_limit = sub.credit_limit
    row.credits_used = sub.credits_used
    row.topup_credits = sub.topup_credits
    row.credits_remaining = sub.credits_remaining
    return row


@router.get("/customers/{user_id}/activity", response_model=Page[AuditLogPublic])
def tenant_activity(
    user_id: str,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    """Recent activity performed by a specific tenant."""
    _get_customer(user_id, db)
    stmt = (
        select(AuditLog)
        .where(AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc())
    )
    rows, total = paginate(db, stmt, page, page_size)
    return build_page(_enrich_logs(db, rows), total, page, page_size)


# ── Pricing plans ───────────────────────────────────────────────────────────
@router.get("/plans", response_model=list[PlanAdminInfo])
def list_admin_plans(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return list_effective_plans(db)


@router.put("/plans/{tier}", response_model=PlanAdminInfo)
def update_plan(
    tier: PlanTier,
    payload: PlanUpdate,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    override = db.get(PlanOverride, tier)
    data = payload.model_dump(exclude_none=True)
    if override:
        for key, value in data.items():
            setattr(override, key, value)
    else:
        override = PlanOverride(tier=tier, published=True, **data)
        db.add(override)
    db.commit()
    db.refresh(override)
    record_audit(
        db,
        user_id=admin.id,
        action="admin.plan.update",
        resource_type="plan",
        resource_id=tier.value,
        detail=data,
    )
    return effective_plan_admin(db, tier)


# ── Tenant integration entitlements ─────────────────────────────────────────
@router.get(
    "/customers/{user_id}/integrations",
    response_model=list[TenantProviderEntitlement],
)
def get_tenant_integrations(
    user_id: str,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    _get_customer(user_id, db)
    return admin_tenant_entitlements(db, user_id)


@router.put(
    "/customers/{user_id}/integrations",
    response_model=list[TenantProviderEntitlement],
)
def set_tenant_integrations(
    user_id: str,
    payload: TenantIntegrationsUpdate,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    _get_customer(user_id, db)
    connected = connected_provider_ids(db)
    for item in payload.providers:
        if item.provider_id not in connected:
            raise HTTPException(
                status_code=400,
                detail=f"Provider {item.provider_id} is not connected at platform level",
            )
        if item.provider_id not in CATALOG_BY_ID:
            raise HTTPException(status_code=400, detail=f"Unknown provider {item.provider_id}")

    existing = {
        r.provider_id: r
        for r in db.scalars(
            select(TenantIntegrationEntitlement).where(
                TenantIntegrationEntitlement.user_id == user_id
            )
        ).all()
    }
    for item in payload.providers:
        row = existing.get(item.provider_id)
        if row:
            row.enabled = item.enabled
        else:
            db.add(
                TenantIntegrationEntitlement(
                    user_id=user_id,
                    provider_id=item.provider_id,
                    enabled=item.enabled,
                )
            )
    db.commit()
    record_audit(
        db,
        user_id=admin.id,
        action="admin.tenant.integrations",
        resource_type="user",
        resource_id=user_id,
        detail={"providers": [p.model_dump() for p in payload.providers]},
    )
    return admin_tenant_entitlements(db, user_id)


# ── Admin phone number provisioning ─────────────────────────────────────────
@router.post("/phone-numbers", response_model=PhoneNumberPublic, status_code=201)
async def admin_provision_phone_number(
    payload: AdminPhoneNumberProvision,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    _get_customer(payload.user_id, db)
    user_id = payload.user_id
    provision_body = PhoneNumberProvision.model_validate(
        payload.model_dump(exclude={"user_id"})
    )
    number = await provision_phone_number(
        db,
        user_id,
        provision_body,
        audit_user_id=admin.id,
        audit_action="admin.phone.provision",
    )
    owner = db.get(User, user_id)
    data = PhoneNumberPublic.model_validate(number)
    if owner:
        data.owner_name = owner.name
        data.owner_email = owner.email
    return data


@router.patch("/phone-numbers/{number_id}", response_model=PhoneNumberPublic)
def admin_reassign_phone_number(
    number_id: str,
    payload: AdminPhoneNumberReassign,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    number = db.get(PhoneNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")
    _get_customer(payload.user_id, db)
    old_owner = number.user_id
    number.user_id = payload.user_id
    number.agent_id = None
    db.commit()
    db.refresh(number)
    record_audit(
        db,
        user_id=admin.id,
        action="admin.phone.reassign",
        resource_type="phone_number",
        resource_id=number_id,
        detail={"from_user_id": old_owner, "to_user_id": payload.user_id},
    )
    owner = db.get(User, payload.user_id)
    data = PhoneNumberPublic.model_validate(number)
    if owner:
        data.owner_name = owner.name
        data.owner_email = owner.email
    return data


@router.delete("/phone-numbers/{number_id}", status_code=204)
async def admin_delete_phone_number(
    number_id: str,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    number = db.get(PhoneNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")
    if number.vapi_phone_number_id:
        await voice_provider.release_phone_number(number.vapi_phone_number_id)
    db.delete(number)
    db.commit()
    record_audit(
        db,
        user_id=admin.id,
        action="admin.phone.remove",
        resource_type="phone_number",
        resource_id=number_id,
    )
