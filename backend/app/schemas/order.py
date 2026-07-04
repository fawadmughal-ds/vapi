"""Order schemas."""

from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import OrderStatus
from app.schemas.common import TimestampedSchema


class OrderCreate(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    product: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=1)


class OrderPublic(TimestampedSchema):
    user_id: str
    agent_id: Optional[str]
    call_id: Optional[str]
    customer_name: Optional[str]
    phone: Optional[str]
    product: Optional[str]
    quantity: int
    status: OrderStatus
    notes: Optional[str]
    extra: dict
