"""Per-tenant integration entitlements (which providers a tenant may use)."""

from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class TenantIntegrationEntitlement(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tenant_integration_entitlements"
    __table_args__ = (
        UniqueConstraint("user_id", "provider_id", name="uq_tenant_provider"),
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
