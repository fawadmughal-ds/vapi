"""Agent schemas. Note: vapi_assistant_id is intentionally NOT exposed."""

from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import AgentStatus
from app.schemas.common import TimestampedSchema


class AgentBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    system_prompt: str = ""
    first_message: Optional[str] = None
    voice_provider: str = "vapi"
    voice_id: str = ""
    language: str = "en"
    model: str = "gpt-4o-mini"
    configuration: dict = Field(default_factory=dict)


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    first_message: Optional[str] = None
    voice_provider: Optional[str] = None
    voice_id: Optional[str] = None
    language: Optional[str] = None
    model: Optional[str] = None
    status: Optional[AgentStatus] = None
    configuration: Optional[dict] = None


class AgentPublic(TimestampedSchema):
    user_id: str
    name: str
    description: Optional[str]
    system_prompt: str
    first_message: Optional[str]
    voice_provider: str
    voice_id: str
    language: str
    model: str
    status: AgentStatus
    configuration: dict
    # Surface only a boolean instead of leaking the internal Vapi id.
    is_provisioned: bool = False


class VoiceOption(BaseModel):
    id: str
    name: str
    provider: str
    language: str
    gender: Optional[str] = None
    preview_url: Optional[str] = None


class WebCallConfig(BaseModel):
    """Credentials the browser needs to start an in-app voice session."""

    public_key: str
    assistant_id: str
