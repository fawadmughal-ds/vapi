"""Contact / sales-inquiry form schemas."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)
    company: Optional[str] = Field(default=None, max_length=200)
    inquiry_type: Optional[str] = Field(default=None, max_length=100)
    company_size: Optional[str] = Field(default=None, max_length=100)
    call_volume: Optional[str] = Field(default=None, max_length=100)
    provider: Optional[str] = Field(default=None, max_length=100)
