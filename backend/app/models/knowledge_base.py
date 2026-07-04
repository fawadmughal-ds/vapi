"""Knowledge base document model."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import DocumentStatus
from app.models.mixins import TimestampMixin, UUIDMixin


class KnowledgeBaseDocument(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_base_documents"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    agent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), index=True, nullable=True
    )

    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.PROCESSING, nullable=False
    )
    extracted_chars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Internal Vapi file id (if uploaded to Vapi as a knowledge source).
    vapi_file_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="documents")  # noqa: F821
    agent: Mapped[Optional["Agent"]] = relationship(back_populates="documents")  # noqa: F821
