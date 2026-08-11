"""Credit pool & wallet logic.

Credits are the platform currency. The platform purchases a pool of credits from
the infrastructure provider; each tenant gets a monthly credit allowance (from
their plan) plus an optional persistent top-up wallet. Calls consume credits
from the tenant and from the global pool.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.call import Call
from app.models.platform_settings import SINGLETON_ID, PlatformSettings
from app.models.subscription import Subscription


def get_platform_settings(db: Session) -> PlatformSettings:
    settings_row = db.get(PlatformSettings, SINGLETON_ID)
    if settings_row is None:
        settings_row = PlatformSettings(id=SINGLETON_ID)
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row


def minutes_to_credits(db: Session, minutes: float) -> float:
    rate = get_platform_settings(db).minutes_per_credit or 1.0
    return minutes / rate if rate else minutes


def credits_to_minutes(db: Session, credits: float) -> float:
    rate = get_platform_settings(db).minutes_per_credit or 1.0
    return credits * rate


def platform_has_capacity(db: Session) -> bool:
    settings_row = get_platform_settings(db)
    if not settings_row.enforce_pool:
        return True
    return settings_row.credits_remaining > 0


def consume_credits(db: Session, sub: Subscription, credits: float) -> None:
    """Deduct credits from a tenant (allowance first, then top-up) and the pool.

    Concurrency-safe: the tenant subscription row and the platform-settings row
    are locked with ``SELECT ... FOR UPDATE`` before the read-modify-write, so
    simultaneous end-of-call deductions serialize instead of clobbering each
    other (which previously allowed lost updates / silent overspend). On engines
    without row locking (e.g. SQLite in tests) ``with_for_update`` is a no-op.
    """
    if credits <= 0:
        return

    # Re-load the subscription under a row lock so the deduction is atomic.
    locked_sub = (
        db.query(Subscription)
        .filter(Subscription.id == sub.id)
        .with_for_update()
        .first()
    ) or sub

    # 1) Spend the monthly allowance, then 2) dip into the top-up wallet.
    period_remaining = max(locked_sub.credit_limit - locked_sub.credits_used, 0.0)
    from_period = min(credits, period_remaining)
    locked_sub.credits_used = (locked_sub.credits_used or 0.0) + from_period
    leftover = credits - from_period
    if leftover > 0:
        locked_sub.topup_credits = max((locked_sub.topup_credits or 0.0) - leftover, 0.0)

    # Mirror into the legacy minute counter for backward-compatible reporting.
    locked_sub.minutes_used = (locked_sub.minutes_used or 0.0) + credits_to_minutes(db, credits)

    # Draw down the global pool under a lock too.
    settings_row = (
        db.query(PlatformSettings)
        .filter(PlatformSettings.id == SINGLETON_ID)
        .with_for_update()
        .first()
    )
    if settings_row is None:
        settings_row = get_platform_settings(db)
    settings_row.credits_used = (settings_row.credits_used or 0.0) + credits

    db.commit()
    # Keep the caller's object consistent with the committed state.
    if locked_sub is not sub:
        db.refresh(sub)


def purchase_credits(db: Session, amount: float) -> PlatformSettings:
    settings_row = get_platform_settings(db)
    settings_row.credits_purchased = (settings_row.credits_purchased or 0.0) + amount
    db.commit()
    db.refresh(settings_row)
    return settings_row


def update_platform_settings(db: Session, **fields) -> PlatformSettings:
    settings_row = get_platform_settings(db)
    for key, value in fields.items():
        if value is not None and hasattr(settings_row, key):
            setattr(settings_row, key, value)
    db.commit()
    db.refresh(settings_row)
    return settings_row


def get_provider_balance_status(db: Session) -> dict:
    """Estimate the voice provider (Vapi) balance.

    Vapi exposes no balance API, so an admin records the balance seen in the
    Vapi dashboard (``provider_balance`` @ ``provider_balance_at``). We subtract
    the real cost of calls that Vapi has billed us since that moment (summed
    from ``Call.cost``) to show a live "credit left" estimate.
    """
    s = get_platform_settings(db)
    total_spend = db.scalar(select(func.coalesce(func.sum(Call.cost), 0.0))) or 0.0

    spent_since = 0.0
    if s.provider_balance_at is not None:
        spent_since = db.scalar(
            select(func.coalesce(func.sum(Call.cost), 0.0)).where(
                Call.created_at >= s.provider_balance_at
            )
        ) or 0.0

    remaining = max(s.provider_balance - spent_since, 0.0)
    return {
        "balance": round(s.provider_balance, 2),
        "currency": s.provider_currency,
        "balance_at": s.provider_balance_at,
        "spent_since": round(float(spent_since), 2),
        "remaining": round(float(remaining), 2),
        "total_spend": round(float(total_spend), 2),
        "is_set": s.provider_balance_at is not None,
    }


def set_provider_balance(
    db: Session, amount: float, currency: str | None = None
) -> PlatformSettings:
    """Record the current Vapi wallet balance; resets the spend baseline to now."""
    s = get_platform_settings(db)
    s.provider_balance = max(amount, 0.0)
    s.provider_balance_at = datetime.now(timezone.utc)
    if currency:
        s.provider_currency = currency
    db.commit()
    db.refresh(s)
    return s


def set_tenant_credit_limit(db: Session, sub: Subscription, limit: float) -> Subscription:
    sub.credit_limit = max(limit, 0.0)
    sub.minutes_limit = int(credits_to_minutes(db, sub.credit_limit))
    db.commit()
    db.refresh(sub)
    return sub


def grant_topup(db: Session, sub: Subscription, amount: float) -> Subscription:
    sub.topup_credits = max((sub.topup_credits or 0.0) + amount, 0.0)
    db.commit()
    db.refresh(sub)
    return sub


def adjust_tenant_credits(db: Session, sub: Subscription, delta: float) -> Subscription:
    """Give (``delta`` > 0) or take back (``delta`` < 0) tenant credits.

    Giving adds to the persistent top-up wallet. Taking back removes from the
    top-up wallet first, then from the current monthly allowance — never below
    zero, so you can't take back more than the tenant actually has.
    """
    if delta > 0:
        sub.topup_credits = (sub.topup_credits or 0.0) + delta
    elif delta < 0:
        take = -delta
        from_topup = min(take, sub.topup_credits or 0.0)
        sub.topup_credits = max((sub.topup_credits or 0.0) - from_topup, 0.0)
        take -= from_topup
        if take > 0:
            period_remaining = max((sub.credit_limit or 0.0) - (sub.credits_used or 0.0), 0.0)
            from_period = min(take, period_remaining)
            sub.credit_limit = max((sub.credit_limit or 0.0) - from_period, 0.0)
            sub.minutes_limit = int(credits_to_minutes(db, sub.credit_limit))
    db.commit()
    db.refresh(sub)
    return sub
