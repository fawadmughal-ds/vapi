"""User model — the tenant root for the multi-tenant platform."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AccountStatus, UserRole
from app.models.mixins import TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.CUSTOMER, nullable=False
    )
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus), default=AccountStatus.ACTIVE, nullable=False
    )
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Indexed so the Stripe webhook can resolve a user by customer id quickly.
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255), index=True, nullable=True
    )

    # Each customer's data lives under their team owner. For simplicity the owner
    # is the user themselves; team members reference their owner via ``parent_id``.
    # FK (SET NULL) keeps referential integrity if an owner is deleted.
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    agents: Mapped[List["Agent"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
    calls: Mapped[List["Call"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
    documents: Mapped[List["KnowledgeBaseDocument"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
    phone_numbers: Mapped[List["PhoneNumber"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
    orders: Mapped[List["Order"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
    subscription: Mapped[Optional["Subscription"]] = relationship(  # noqa: F821
        back_populates="owner", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def is_super_admin(self) -> bool:
        return self.role == UserRole.SUPER_ADMIN
