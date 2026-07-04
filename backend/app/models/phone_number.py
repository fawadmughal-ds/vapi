"""Phone number model linking users, agents and numbers."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PhoneNumberStatus
from app.models.mixins import TimestampMixin, UUIDMixin


class PhoneNumber(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "phone_numbers"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    agent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), index=True, nullable=True
    )

    e164_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    provider: Mapped[str] = mapped_column(String(64), default="twilio", nullable=False)
    country: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)

    status: Mapped[PhoneNumberStatus] = mapped_column(
        Enum(PhoneNumberStatus), default=PhoneNumberStatus.AVAILABLE, nullable=False
    )

    # Internal Vapi phone number id.
    vapi_phone_number_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="phone_numbers")  # noqa: F821
    agent: Mapped[Optional["Agent"]] = relationship(back_populates="phone_numbers")  # noqa: F821

    @property
    def is_provisioned(self) -> bool:
        return bool(self.vapi_phone_number_id)
