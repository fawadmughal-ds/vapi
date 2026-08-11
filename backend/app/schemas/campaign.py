"""Campaign schemas."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.enums import CampaignStatus, ContactStatus
from app.schemas.common import TimestampedSchema


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    agent_id: str
    phone_number_id: Optional[str] = None


class ContactInput(BaseModel):
    name: Optional[str] = None
    phone: str = Field(min_length=3, max_length=32)


class ContactUpload(BaseModel):
    contacts: List[ContactInput] = Field(min_length=1)


class ContactPublic(TimestampedSchema):
    campaign_id: str
    name: Optional[str]
    phone: str
    status: ContactStatus
    call_id: Optional[str]
    error: Optional[str]


class CampaignPublic(TimestampedSchema):
    user_id: str
    agent_id: str
    phone_number_id: Optional[str]
    name: str
    status: CampaignStatus
    # Derived
    agent_name: Optional[str] = None
    phone_number: Optional[str] = None
    total_contacts: int = 0
    called_contacts: int = 0
    pending_contacts: int = 0
    failed_contacts: int = 0


class LaunchResult(BaseModel):
    queued: int
    failed: int
    skipped: int
    detail: str
