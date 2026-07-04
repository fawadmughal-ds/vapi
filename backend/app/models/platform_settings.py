"""Platform-wide capacity & credit settings (single row).

Represents the credit pool the platform has purchased from the underlying voice
infrastructure provider (what we "bought", e.g. 500 minutes worth of credits),
plus the conversion rate and enforcement policy. Credits are the platform
currency; minutes shown in the UI are derived via ``minutes_per_credit``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin

# Fixed primary key — there is only ever one settings row.
SINGLETON_ID = "platform"


class PlatformSettings(TimestampMixin, Base):
    __tablename__ = "platform_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=SINGLETON_ID)

    # Total credits purchased from the infrastructure provider.
    credits_purchased: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Total credits consumed across all tenants.
    credits_used: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # How many call minutes one credit is worth (1 credit = 1 minute by default).
    minutes_per_credit: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # When True, calls are blocked once the platform pool is exhausted.
    enforce_pool: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Optional warning threshold (credits remaining) for the admin dashboard.
    low_balance_threshold: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ── Voice-provider (Vapi) wallet mirror ─────────────────────────────────
    # Vapi has no API to read the wallet balance, so an admin enters the current
    # balance from the Vapi dashboard here. We then subtract real call spend
    # (sum of Call.cost) recorded AFTER ``provider_balance_at`` to show a live
    # "credit left" estimate that decrements as calls happen.
    provider_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    provider_balance_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Display label for the balance unit as shown in the Vapi dashboard.
    provider_currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)

    @property
    def credits_remaining(self) -> float:
        return max(self.credits_purchased - self.credits_used, 0.0)
