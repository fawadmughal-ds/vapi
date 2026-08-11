"""Subscription / plan + usage tracking model."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PlanTier, SubscriptionStatus
from app.models.mixins import TimestampMixin, UUIDMixin


class Subscription(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    plan: Mapped[PlanTier] = mapped_column(
        Enum(PlanTier), default=PlanTier.STARTER, nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.INACTIVE, nullable=False
    )

    # Legacy minute fields (kept for backward compatibility; credits are the
    # source of truth now). At the default 1 credit = 1 minute rate these mirror
    # the credit fields below.
    minutes_limit: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    minutes_used: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Credit wallet ─────────────────────────────────────────────────────────
    # Monthly allowance granted by the plan (admin can override). Resets each
    # billing period.
    credit_limit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Credits consumed in the current period.
    credits_used: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Persistent admin-granted top-up wallet — consumed after the monthly
    # allowance and NOT reset between periods.
    topup_credits: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255), index=True, nullable=True
    )
    stripe_price_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    current_period_start: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_period_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    owner: Mapped["User"] = relationship(back_populates="subscription")  # noqa: F821

    @property
    def period_credits_remaining(self) -> float:
        return max(self.credit_limit - self.credits_used, 0.0)

    @property
    def credits_remaining(self) -> float:
        """Total spendable credits = remaining monthly allowance + top-up wallet."""
        return self.period_credits_remaining + (self.topup_credits or 0.0)

    @property
    def minutes_remaining(self) -> float:
        # Kept for backward-compatible API shape (1:1 with credits at rate 1.0).
        return self.credits_remaining

    @property
    def has_quota(self) -> bool:
        return (
            self.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING)
            and self.credits_remaining > 0
        )
