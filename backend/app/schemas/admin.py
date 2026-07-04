"""Super-admin schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import AccountStatus, PlanTier, UserRole
from app.schemas.common import ORMBase, TimestampedSchema


class AdminUserRow(ORMBase):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    status: AccountStatus
    is_email_verified: bool
    company_name: Optional[str] = None
    agent_count: int = 0
    call_count: int = 0
    plan: Optional[PlanTier] = None
    # Credit wallet snapshot (what the tenant sees/consumes)
    credit_limit: float = 0.0
    credits_used: float = 0.0
    topup_credits: float = 0.0
    credits_remaining: float = 0.0
    # Real provider spend (USD) for this tenant's calls — admin-only visibility.
    total_cost: float = 0.0
    minutes_used: float = 0.0


class PlatformCredits(BaseModel):
    credits_purchased: float
    credits_used: float
    credits_remaining: float
    minutes_per_credit: float
    enforce_pool: bool
    low_balance_threshold: float
    # Derived insight
    minutes_remaining: float
    credits_allocated: float  # sum of active tenant allowances + top-ups
    is_low: bool


class CreditPurchase(BaseModel):
    amount: float = Field(gt=0, description="Credits to add to the platform pool")


class ProviderBalance(BaseModel):
    """Estimated voice-provider (Vapi) wallet balance shown in platform admin."""

    balance: float
    currency: str
    balance_at: Optional[datetime] = None
    spent_since: float
    remaining: float
    total_spend: float
    is_set: bool


class ProviderBalanceUpdate(BaseModel):
    balance: float = Field(ge=0, description="Current balance read from the Vapi dashboard")
    currency: Optional[str] = Field(default=None, max_length=8)


class PlatformSettingsUpdate(BaseModel):
    minutes_per_credit: Optional[float] = Field(default=None, gt=0)
    enforce_pool: Optional[bool] = None
    low_balance_threshold: Optional[float] = Field(default=None, ge=0)


class TenantCreditUpdate(BaseModel):
    credit_limit: Optional[float] = Field(default=None, ge=0)
    add_topup: Optional[float] = None


class ResourceSyncCount(BaseModel):
    imported: int = 0
    updated: int = 0
    total: int = 0


class SyncResult(BaseModel):
    """Summary of an import from the voice provider into the platform."""

    agents: Optional[ResourceSyncCount] = None
    calls: Optional[ResourceSyncCount] = None
    integrations: Optional[ResourceSyncCount] = None
    phone_numbers: Optional[ResourceSyncCount] = None


class PlatformStats(ORMBase):
    total_customers: int
    total_agents: int
    total_calls: int
    total_minutes: float
    total_revenue_estimate: float
    total_cost: float = 0.0
    active_subscriptions: int


class AuditLogPublic(TimestampedSchema):
    user_id: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    detail: dict = {}
    # Enriched from the related user (the actor who performed the action).
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
