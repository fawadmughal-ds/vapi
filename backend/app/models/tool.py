"""Dynamic function-calling tools attached to agents."""

from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class AgentTool(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "agent_tools"

    agent_id: Mapped[str] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # JSON schema describing the tool parameters (OpenAI function-calling format).
    parameters_schema: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Where the backend routes the execution to (internal handler key).
    handler: Mapped[str] = mapped_column(String(64), default="generic", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    agent: Mapped["Agent"] = relationship(back_populates="tools")  # noqa: F821
