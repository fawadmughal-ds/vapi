"""Authentication routes: register, login, refresh, verify, password reset."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    generate_url_safe_token,
    hash_otp,
    hash_password,
    verify_otp,
    verify_password,
)
from app.models.enums import UserRole
from app.models.token import EmailToken
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    TokenPair,
    UserPublic,
    VerifyEmailRequest,
    VerifyOtpRequest,
)
from app.schemas.common import Message
from app.services.audit import record_audit
from app.services.billing import ensure_subscription
from app.services.email import email_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )


def _create_email_token(db: Session, user: User, purpose: str, hours: int) -> str:
    token = generate_url_safe_token()
    db.add(
        EmailToken(
            user_id=user.id,
            token=token,
            purpose=purpose,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=hours),
        )
    )
    db.commit()
    return token


# OTP codes are short-lived and stored hashed (bound to the user) in the same
# email_tokens table, so no schema migration is required.
OTP_PURPOSE = "verify_otp"
OTP_TTL_MINUTES = 15


def _create_verification_otp(db: Session, user: User) -> str:
    """Invalidate any prior codes and issue a fresh 6-digit OTP for the user."""
    db.query(EmailToken).filter(
        EmailToken.user_id == user.id,
        EmailToken.purpose == OTP_PURPOSE,
        EmailToken.used == False,  # noqa: E712
    ).update({EmailToken.used: True})
    code = generate_otp(6)
    db.add(
        EmailToken(
            user_id=user.id,
            token=hash_otp(user.id, code),
            purpose=OTP_PURPOSE,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
        )
    )
    db.commit()
    return code


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=UserRole.CUSTOMER,
        company_name=payload.company_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    ensure_subscription(db, user.id)

    code = _create_verification_otp(db, user)
    email_service.send_verification_otp(to=user.email, name=user.name, code=code)

    record_audit(db, user_id=user.id, action="user.register", resource_type="user",
                 resource_id=user.id, ip_address=request.client.host if request.client else None)

    return AuthResponse(user=UserPublic.model_validate(user), tokens=_issue_tokens(user))


@router.post("/login", response_model=AuthResponse)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    record_audit(db, user_id=user.id, action="user.login", resource_type="user",
                 resource_id=user.id, ip_address=request.client.host if request.client else None)

    return AuthResponse(user=UserPublic.model_validate(user), tokens=_issue_tokens(user))


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != REFRESH_TOKEN_TYPE:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.get(User, data.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _issue_tokens(user)


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)):
    return UserPublic.model_validate(user)


@router.post("/verify-email", response_model=Message)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    token = (
        db.query(EmailToken)
        .filter(EmailToken.token == payload.token, EmailToken.purpose == "verify")
        .first()
    )
    if not token or token.used or token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_email_verified = True
    token.used = True
    db.commit()
    return Message(detail="Email verified successfully")


@router.post("/verify-otp", response_model=Message)
def verify_otp_code(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify a new user's email using the 6-digit code sent on registration."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    if user.is_email_verified:
        return Message(detail="Email already verified")

    code = payload.code.strip()
    token = (
        db.query(EmailToken)
        .filter(
            EmailToken.user_id == user.id,
            EmailToken.purpose == OTP_PURPOSE,
            EmailToken.used == False,  # noqa: E712
            EmailToken.token == hash_otp(user.id, code),
        )
        .first()
    )
    if (
        not token
        or not verify_otp(user.id, code, token.token)
        or token.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user.is_email_verified = True
    token.used = True
    db.commit()
    email_service.send_welcome(to=user.email, name=user.name)
    record_audit(db, user_id=user.id, action="user.verify_email", resource_type="user",
                 resource_id=user.id)
    return Message(detail="Email verified successfully")


@router.post("/resend-otp", response_model=Message)
def resend_otp(payload: ResendOtpRequest, db: Session = Depends(get_db)):
    """Re-send a verification code. Generic response to avoid user enumeration."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user and not user.is_email_verified:
        code = _create_verification_otp(db, user)
        email_service.send_verification_otp(to=user.email, name=user.name, code=code)
    return Message(detail="If that account needs verification, a new code has been sent")


@router.post("/resend-verification", response_model=Message)
def resend_verification(user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    if user.is_email_verified:
        return Message(detail="Email already verified")
    code = _create_verification_otp(db, user)
    email_service.send_verification_otp(to=user.email, name=user.name, code=code)
    return Message(detail="Verification code sent")


@router.post("/forgot-password", response_model=Message)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    # Always return success to avoid user enumeration.
    if user:
        token = _create_email_token(db, user, "reset", hours=1)
        link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        email_service.send_password_reset(to=user.email, name=user.name, link=link)
    return Message(detail="If that email exists, a reset link has been sent")


@router.post("/reset-password", response_model=Message)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token = (
        db.query(EmailToken)
        .filter(EmailToken.token == payload.token, EmailToken.purpose == "reset")
        .first()
    )
    if not token or token.used or token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(payload.new_password)
    token.used = True
    db.commit()
    record_audit(db, user_id=user.id, action="user.password_reset", resource_type="user",
                 resource_id=user.id)
    return Message(detail="Password reset successfully")
