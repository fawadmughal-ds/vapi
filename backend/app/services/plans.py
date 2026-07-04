"""Plan catalog — defaults merged with admin-editable DB overrides."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import PlanTier
from app.models.plan_override import PlanOverride
from app.schemas.billing import PlanAdminInfo, PlanInfo

PLAN_CATALOG: dict[PlanTier, PlanInfo] = {
    PlanTier.STARTER: PlanInfo(
        tier=PlanTier.STARTER,
        name="Starter",
        minutes=500,
        credits=500,
        price_usd=49.0,
        features=[
            "500 voice minutes / month",
            "Up to 2 AI agents",
            "Call logs & transcripts",
            "Basic analytics",
            "Email support",
        ],
    ),
    PlanTier.GROWTH: PlanInfo(
        tier=PlanTier.GROWTH,
        name="Growth",
        minutes=2000,
        credits=2000,
        price_usd=149.0,
        features=[
            "2,000 voice minutes / month",
            "Up to 10 AI agents",
            "Knowledge base uploads",
            "Advanced analytics",
            "Function calling & tools",
            "Priority support",
        ],
    ),
    PlanTier.PRO: PlanInfo(
        tier=PlanTier.PRO,
        name="Pro",
        minutes=10000,
        credits=10000,
        price_usd=499.0,
        features=[
            "10,000 voice minutes / month",
            "Unlimited AI agents",
            "Team members & RBAC",
            "Dedicated phone numbers",
            "Custom integrations",
            "SLA & dedicated support",
        ],
    ),
}


def _override_map(db: Session) -> dict[PlanTier, PlanOverride]:
    return {o.tier: o for o in db.scalars(select(PlanOverride)).all()}


def effective_plan_info(db: Session, tier: PlanTier) -> PlanInfo:
    """Return merged plan details for a tier (catalog defaults + DB override)."""
    default = PLAN_CATALOG[tier]
    override = _override_map(db).get(tier)
    if not override:
        return default
    return PlanInfo(
        tier=tier,
        name=override.name or default.name,
        minutes=override.minutes if override.minutes is not None else default.minutes,
        credits=override.credits if override.credits is not None else default.credits,
        price_usd=override.price_usd if override.price_usd is not None else default.price_usd,
        features=override.features if override.features is not None else default.features,
    )


def effective_plan_admin(db: Session, tier: PlanTier) -> PlanAdminInfo:
    """Admin view including published flag."""
    info = effective_plan_info(db, tier)
    override = _override_map(db).get(tier)
    published = override.published if override else True
    return PlanAdminInfo(**info.model_dump(), published=published)


def list_effective_plans(db: Session) -> list[PlanAdminInfo]:
    return [effective_plan_admin(db, tier) for tier in PlanTier]


def list_published_plans(db: Session) -> list[PlanInfo]:
    """Plans visible on the marketing site and tenant billing."""
    return [
        effective_plan_info(db, tier)
        for tier in PlanTier
        if effective_plan_admin(db, tier).published
    ]


def stripe_price_for(plan: PlanTier) -> str:
    return {
        PlanTier.STARTER: settings.STRIPE_PRICE_STARTER,
        PlanTier.GROWTH: settings.STRIPE_PRICE_GROWTH,
        PlanTier.PRO: settings.STRIPE_PRICE_PRO,
    }[plan]


def plan_for_stripe_price(price_id: str) -> PlanTier | None:
    mapping = {
        settings.STRIPE_PRICE_STARTER: PlanTier.STARTER,
        settings.STRIPE_PRICE_GROWTH: PlanTier.GROWTH,
        settings.STRIPE_PRICE_PRO: PlanTier.PRO,
    }
    return mapping.get(price_id)
