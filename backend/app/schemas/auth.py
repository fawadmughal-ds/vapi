"""Auth-related schemas."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import AccountStatus, UserRole
from app.schemas.common import ORMBase


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    company_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class UserPublic(ORMBase):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    status: AccountStatus
    is_email_verified: bool
    company_name: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserPublic
    tokens: TokenPair
