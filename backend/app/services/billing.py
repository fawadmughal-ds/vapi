"""Subscription & quota management helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.enums import PlanTier, SubscriptionStatus
from app.models.subscription import Subscription
from app.services.credits import (
    consume_credits,
    get_platform_settings,
    minutes_to_credits,
    platform_has_capacity,
)
from app.services.plans import effective_plan_info, list_published_plans

# New tenants get a small free-trial credit grant to explore the product — not
# the full Starter allowance. Paying (activating a plan) unlocks the plan credits.
TRIAL_CREDITS = 10.0


def ensure_subscription(db: Session, user_id: str) -> Subscription:
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        return sub
    # New tenants get a Starter trial with a fixed 10-credit grant.
    now = datetime.now(timezone.utc)
    minutes_per_credit = get_platform_settings(db).minutes_per_credit or 1.0
    sub = Subscription(
        user_id=user_id,
        plan=PlanTier.STARTER,
        status=SubscriptionStatus.TRIALING,
        minutes_limit=int(TRIAL_CREDITS * minutes_per_credit),
        minutes_used=0,
        credit_limit=TRIAL_CREDITS,
        credits_used=0.0,
        topup_credits=0.0,
        current_period_start=now,
        current_period_end=now + timedelta(days=14),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def activate_plan(
    db: Session,
    user_id: str,
    plan: PlanTier,
    *,
    stripe_subscription_id: str | None = None,
    stripe_price_id: str | None = None,
) -> Subscription:
    sub = ensure_subscription(db, user_id)
    plan_info = effective_plan_info(db, plan)
    now = datetime.now(timezone.utc)
    sub.plan = plan
    sub.status = SubscriptionStatus.ACTIVE
    sub.minutes_limit = plan_info.minutes
    sub.minutes_used = 0
    # Reset the monthly allowance; top-up wallet persists across periods.
    sub.credit_limit = float(plan_info.credits)
    sub.credits_used = 0.0
    sub.stripe_subscription_id = stripe_subscription_id or sub.stripe_subscription_id
    sub.stripe_price_id = stripe_price_id or sub.stripe_price_id
    sub.current_period_start = now
    sub.current_period_end = now + timedelta(days=30)
    db.commit()
    db.refresh(sub)
    return sub


def cancel_subscription(db: Session, user_id: str) -> Subscription:
    """Mark a subscription canceled and revoke the paid monthly allowance.

    Called from the Stripe ``customer.subscription.deleted`` webhook so that a
    downgrade/cancellation in the Stripe portal is reflected in our DB instead of
    leaving the tenant on a paid plan forever. The persistent top-up wallet is
    preserved.
    """
    sub = ensure_subscription(db, user_id)
    sub.status = SubscriptionStatus.CANCELED
    sub.credit_limit = 0.0
    sub.credits_used = 0.0
    sub.minutes_limit = 0
    sub.minutes_used = 0
    db.commit()
    db.refresh(sub)
    return sub


def record_usage(db: Session, user_id: str, minutes: float) -> None:
    """Convert call minutes into credits and deduct from tenant + platform pool."""
    sub = ensure_subscription(db, user_id)
    credits = minutes_to_credits(db, minutes)
    consume_credits(db, sub, credits)


def has_available_quota(db: Session, user_id: str) -> bool:
    """A tenant can place a call only if it has credits AND the pool has capacity."""
    sub = ensure_subscription(db, user_id)
    return sub.has_quota and platform_has_capacity(db)
