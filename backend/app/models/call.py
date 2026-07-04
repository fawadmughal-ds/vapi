"""Call log model — populated primarily from Vapi webhooks."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import CallDirection, CallStatus
from app.models.mixins import TimestampMixin, UUIDMixin


class Call(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "calls"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    agent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), index=True, nullable=True
    )

    # Internal correlation IDs (not surfaced to clients as "Vapi").
    vapi_call_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    call_sid: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)

    direction: Mapped[CallDirection] = mapped_column(
        Enum(CallDirection), default=CallDirection.INBOUND, nullable=False
    )
    status: Mapped[CallStatus] = mapped_column(
        Enum(CallStatus), default=CallStatus.QUEUED, nullable=False
    )

    caller_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    callee_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    recording_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ended_reason: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="calls")  # noqa: F821
    agent: Mapped[Optional["Agent"]] = relationship(back_populates="calls")  # noqa: F821
