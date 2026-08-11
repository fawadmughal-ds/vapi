"""Outbound campaign models.

A campaign pairs an agent with an outbound phone number and a list of contacts.
Launching a campaign places outbound calls to its pending contacts.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import CampaignStatus, ContactStatus
from app.models.mixins import TimestampMixin, UUIDMixin


class Campaign(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "campaigns"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    agent_id: Mapped[str] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    phone_number_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("phone_numbers.id", ondelete="SET NULL"), index=True, nullable=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus), default=CampaignStatus.DRAFT, nullable=False
    )

    contacts: Mapped[List["CampaignContact"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignContact(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "campaign_contacts"

    campaign_id: Mapped[str] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)

    status: Mapped[ContactStatus] = mapped_column(
        Enum(ContactStatus), default=ContactStatus.PENDING, nullable=False
    )
    call_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("calls.id", ondelete="SET NULL"), index=True, nullable=True
    )
    error: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="contacts")
