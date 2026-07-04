"""Order model — created by AI function-calling (e.g. create_order tool)."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Enum, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import OrderStatus
from app.models.mixins import TimestampMixin, UUIDMixin


class Order(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "orders"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    agent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), index=True, nullable=True
    )
    call_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("calls.id", ondelete="SET NULL"), index=True, nullable=True
    )

    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    product: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    extra: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    owner: Mapped["User"] = relationship(back_populates="orders")  # noqa: F821
