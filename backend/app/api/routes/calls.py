"""Call logs routes with search, filtering, pagination, and outbound dialing."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.routes.pagination import build_page, paginate
from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.call import Call
from app.models.enums import CallDirection, CallStatus
from app.models.phone_number import PhoneNumber
from app.models.user import User
from app.schemas.call import CallPublic, OutboundCallRequest
from app.schemas.common import Page
from app.services import vapi_sync
from app.services.audit import record_audit
from app.services.billing import ensure_subscription
from app.services.credits import platform_has_capacity
from app.services.voice import voice_provider

router = APIRouter(prefix="/calls", tags=["calls"])


def _to_public(call: Call) -> CallPublic:
    data = CallPublic.model_validate(call)
    data.agent_name = call.agent.name if call.agent else None
    return data


@router.get("", response_model=Page[CallPublic])
def list_calls(
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status_filter: CallStatus | None = Query(None, alias="status"),
    agent_id: str | None = None,
    direction: CallDirection | None = None,
):
    stmt = select(Call).where(Call.user_id == tenant_id(user))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Call.caller_number.ilike(like),
                Call.callee_number.ilike(like),
                Call.transcript.ilike(like),
                Call.summary.ilike(like),
            )
        )
    if status_filter:
        stmt = stmt.where(Call.status == status_filter)
    if agent_id:
        stmt = stmt.where(Call.agent_id == agent_id)
    if direction:
        stmt = stmt.where(Call.direction == direction)
    stmt = stmt.order_by(Call.created_at.desc())

    rows, total = paginate(db, stmt, page, page_size)
    return build_page([_to_public(c) for c in rows], total, page, page_size)


@router.post("/sync")
async def sync_calls(user: User = Depends(get_verified_user),
                     db: Session = Depends(get_db)):
    """Import calls that exist in the provider org into this account."""
    res = await vapi_sync.sync_calls(db, tenant_id(user))
    record_audit(db, user_id=user.id, action="call.sync", resource_type="call",
                 detail=res.as_dict())
    return res.as_dict()


@router.get("/{call_id}", response_model=CallPublic)
def get_call(call_id: str, user: User = Depends(get_verified_user),
             db: Session = Depends(get_db)):
    call = db.get(Call, call_id)
    if not call or call.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Call not found")
    return _to_public(call)


@router.post("/outbound", response_model=CallPublic, status_code=201)
async def start_outbound_call(
    payload: OutboundCallRequest,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    sub = ensure_subscription(db, tenant_id(user))
    if not sub.has_quota:
        raise HTTPException(
            status_code=402,
            detail="Credit balance exhausted. Upgrade your plan or add credits.",
        )
    if not platform_has_capacity(db):
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable. Please try again later.",
        )

    agent = db.get(Agent, payload.agent_id)
    if not agent or agent.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Agent not found")
    if not agent.vapi_assistant_id:
        raise HTTPException(status_code=400, detail="Publish the agent before placing calls")

    # Resolve the "from" number — Vapi requires an active (provisioned) number.
    if payload.from_phone_number_id:
        number = db.get(PhoneNumber, payload.from_phone_number_id)
        if not number or number.user_id != tenant_id(user):
            raise HTTPException(status_code=404, detail="Phone number not found")
        if not number.vapi_phone_number_id:
            raise HTTPException(
                status_code=400,
                detail="That number isn't active for calls yet. Provision it or "
                       "choose another number.",
            )
        phone_vapi_id = number.vapi_phone_number_id
    else:
        # Auto-pick the tenant's first active number.
        number = (
            db.query(PhoneNumber)
            .filter(
                PhoneNumber.user_id == tenant_id(user),
                PhoneNumber.vapi_phone_number_id.isnot(None),
            )
            .first()
        )
        phone_vapi_id = number.vapi_phone_number_id if number else None

    if not phone_vapi_id:
        raise HTTPException(
            status_code=400,
            detail="You need an active phone number to place calls. Add or buy a "
                   "number on the Phone Numbers page first.",
        )

    result = await voice_provider.create_outbound_call(
        agent.vapi_assistant_id, payload.to_number, phone_vapi_id
    )

    call = Call(
        user_id=tenant_id(user),
        agent_id=agent.id,
        vapi_call_id=result.get("id"),
        direction=CallDirection.OUTBOUND,
        status=CallStatus.QUEUED,
        callee_number=payload.to_number,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    record_audit(db, user_id=user.id, action="call.outbound", resource_type="call",
                 resource_id=call.id)
    return _to_public(call)
