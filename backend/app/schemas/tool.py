"""Function-calling tool schemas."""

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedSchema


class ToolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str = ""
    parameters_schema: dict = Field(default_factory=dict)
    handler: str = "generic"
    enabled: bool = True


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters_schema: Optional[dict] = None
    handler: Optional[str] = None
    enabled: Optional[bool] = None


class ToolPublic(TimestampedSchema):
    agent_id: str
    name: str
    description: str
    parameters_schema: dict
    handler: str
    enabled: bool
    # Populated in aggregate (tenant-wide / admin) listings.
    agent_name: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
