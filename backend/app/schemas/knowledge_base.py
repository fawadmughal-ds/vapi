"""Knowledge base schemas."""

from typing import Optional

from app.models.enums import DocumentStatus
from app.schemas.common import TimestampedSchema


class DocumentPublic(TimestampedSchema):
    user_id: str
    agent_id: Optional[str]
    file_name: str
    file_type: str
    file_size: int
    status: DocumentStatus
    extracted_chars: int
    error_message: Optional[str]
    # Populated in cross-tenant (admin) listings.
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
