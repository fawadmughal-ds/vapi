"""Billing / subscription schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import PlanTier, SubscriptionStatus
from app.schemas.common import ORMBase


class PlanInfo(BaseModel):
    tier: PlanTier
    name: str
    minutes: int
    credits: int
    price_usd: float
    features: list[str]


class PlanAdminInfo(PlanInfo):
    published: bool = True


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    minutes: Optional[int] = Field(default=None, ge=0)
    credits: Optional[int] = Field(default=None, ge=0)
    price_usd: Optional[float] = Field(default=None, ge=0)
    features: Optional[list[str]] = None
    published: Optional[bool] = None


class SubscriptionPublic(ORMBase):
    id: str
    plan: PlanTier
    status: SubscriptionStatus
    minutes_limit: int
    minutes_used: float
    minutes_remaining: float
    # Credit wallet
    credit_limit: float
    credits_used: float
    topup_credits: float
    credits_remaining: float
    # Conversion: minutes = credits * minutes_per_credit
    minutes_per_credit: float = 1.0
    minutes_balance: float = 0.0
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]


class CheckoutRequest(BaseModel):
    plan: PlanTier
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    checkout_url: str
