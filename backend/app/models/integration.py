"""Platform-level provider integrations (voice/model providers, etc.).

These are managed by the super-admin and connected to the underlying voice
infrastructure. Only a masked key is ever stored locally; the real secret lives
with the infrastructure provider.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Integration(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "integrations"

    # Catalog id, e.g. "elevenlabs", "openai".
    provider: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="other", nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Last 4 chars of the API key, for display only — never the full secret.
    masked_key: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Reference to the credential created in the underlying infra provider.
    vapi_credential_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="connected", nullable=False)
