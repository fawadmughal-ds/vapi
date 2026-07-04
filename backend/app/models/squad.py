"""Squad model — a group of agents that can hand off calls to each other.

Mirrors the provider's "squad" concept: an ordered set of member agents with a
primary that answers first and can transfer to the others.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Squad(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "squads"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Ordered list of member agent ids. The first is the primary (answers first).
    member_agent_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Internal provider squad id once provisioned.
    vapi_squad_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    @property
    def is_provisioned(self) -> bool:
        return bool(self.vapi_squad_id)
