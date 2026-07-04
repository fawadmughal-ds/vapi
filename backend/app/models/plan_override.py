"""Admin-editable overrides for subscription plan catalog entries.

The hardcoded ``PLAN_CATALOG`` remains the default; rows here override display
pricing and visibility for the marketing site and tenant billing.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import JSON, Boolean, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import PlanTier
from app.models.mixins import TimestampMixin


class PlanOverride(TimestampMixin, Base):
    __tablename__ = "plan_overrides"

    tier: Mapped[PlanTier] = mapped_column(Enum(PlanTier), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    credits: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    features: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
