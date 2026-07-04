"""AI Voice Agent model. Maps a tenant-facing agent to an internal Vapi assistant."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AgentStatus
from app.models.mixins import TimestampMixin, UUIDMixin


class Agent(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "agents"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Internal Vapi reference — NEVER exposed in public API responses.
    vapi_assistant_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    system_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    first_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    voice_provider: Mapped[str] = mapped_column(String(64), default="vapi", nullable=False)
    voice_id: Mapped[str] = mapped_column(String(128), default="", nullable=False)
    language: Mapped[str] = mapped_column(String(16), default="en", nullable=False)
    model: Mapped[str] = mapped_column(String(64), default="gpt-4o-mini", nullable=False)

    status: Mapped[AgentStatus] = mapped_column(
        Enum(AgentStatus), default=AgentStatus.DRAFT, nullable=False
    )

    # Arbitrary extra configuration (temperature, max tokens, transfer rules, etc.)
    configuration: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    owner: Mapped["User"] = relationship(back_populates="agents")  # noqa: F821
    calls: Mapped[List["Call"]] = relationship(  # noqa: F821
        back_populates="agent", cascade="all, delete-orphan"
    )
    phone_numbers: Mapped[List["PhoneNumber"]] = relationship(  # noqa: F821
        back_populates="agent"
    )
    documents: Mapped[List["KnowledgeBaseDocument"]] = relationship(  # noqa: F821
        back_populates="agent"
    )
    tools: Mapped[List["AgentTool"]] = relationship(  # noqa: F821
        back_populates="agent", cascade="all, delete-orphan"
    )
