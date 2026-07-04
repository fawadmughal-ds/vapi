"""Call schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.enums import CallDirection, CallStatus
from app.schemas.common import TimestampedSchema


class CallPublic(TimestampedSchema):
    user_id: str
    agent_id: Optional[str]
    call_sid: Optional[str]
    direction: CallDirection
    status: CallStatus
    caller_number: Optional[str]
    callee_number: Optional[str]
    duration_seconds: int
    cost: float
    recording_url: Optional[str]
    transcript: Optional[str]
    summary: Optional[str]
    ended_reason: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    agent_name: Optional[str] = None
    # Populated only in platform-admin (cross-tenant) views.
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None


class OutboundCallRequest(BaseModel):
    agent_id: str
    to_number: str
    from_phone_number_id: Optional[str] = None
