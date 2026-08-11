"""Phone number schemas."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.enums import PhoneNumberStatus
from app.schemas.common import TimestampedSchema

E164 = r"^\+[1-9]\d{6,14}$"


class PhoneNumberCreate(BaseModel):
    e164_number: str = Field(pattern=E164)
    label: Optional[str] = None
    provider: str = "twilio"
    country: Optional[str] = None


PhoneMethod = Literal[
    "vapi_number",  # Free provider-hosted US number (by area code)
    "vapi_sip",     # Free provider SIP number
    "twilio",       # Import a Twilio number you own
    "vonage",       # Import a Vonage number you own
    "telnyx",       # Import a Telnyx number you own
    "byo_sip",      # Bring your own SIP trunk number
]


class PhoneNumberProvision(BaseModel):
    """How the customer wants to add a number (mirrors the provider options)."""

    method: PhoneMethod = "vapi_number"
    label: Optional[str] = None
    country: Optional[str] = None

    # Free Vapi number
    area_code: Optional[str] = Field(default=None, min_length=3, max_length=3)
    # SIP-based options
    sip_uri: Optional[str] = None

    # Numbers you own (twilio/vonage/telnyx/byo)
    e164_number: Optional[str] = None

    # Twilio credentials (fall back to platform config when blank)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None

    # Vonage / Telnyx / BYO SIP — a provider credential id (from Integrations)
    credential_id: Optional[str] = None


class PhoneNumberAssign(BaseModel):
    agent_id: Optional[str] = None


class AdminPhoneNumberProvision(PhoneNumberProvision):
    user_id: str


class AdminPhoneNumberReassign(BaseModel):
    user_id: str


class PhoneNumberPublic(TimestampedSchema):
    user_id: str
    agent_id: Optional[str]
    e164_number: str
    label: Optional[str]
    provider: str
    country: Optional[str]
    status: PhoneNumberStatus
    is_provisioned: bool = False
    # Populated only in platform-admin (cross-tenant) views.
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
