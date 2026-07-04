"""Squad schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedSchema


class SquadMember(BaseModel):
    agent_id: str
    agent_name: Optional[str] = None
    is_provisioned: bool = False


class SquadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    member_agent_ids: List[str] = Field(default_factory=list)


class SquadUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    member_agent_ids: Optional[List[str]] = None


class SquadPublic(TimestampedSchema):
    user_id: str
    name: str
    description: Optional[str]
    member_agent_ids: List[str]
    is_provisioned: bool = False
    members: List[SquadMember] = Field(default_factory=list)
    # Populated in admin (cross-tenant) listings.
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
