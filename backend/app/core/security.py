"""Password hashing and JWT token utilities."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(subject: str, token_type: str, expires_delta: timedelta, **extra) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        **extra,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(
    subject: str, role: str, impersonated_by: Optional[str] = None
) -> str:
    extra: dict[str, Any] = {"role": role}
    if impersonated_by:
        # Records which super-admin is acting as this user (for audit/UX).
        extra["act"] = impersonated_by
    return _create_token(
        subject,
        ACCESS_TOKEN_TYPE,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        **extra,
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject,
        REFRESH_TOKEN_TYPE,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def generate_url_safe_token(length: int = 48) -> str:
    """Used for email verification and password reset tokens."""
    return secrets.token_urlsafe(length)


def generate_otp(length: int = 6) -> str:
    """Cryptographically-random numeric one-time password (zero-padded)."""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def hash_otp(user_id: str, code: str) -> str:
    """Deterministic, per-user hash of an OTP so we never store the raw code.

    Bound to the user id and the app secret so codes are unique per user and
    cannot be precomputed. Fits the existing ``email_tokens.token`` column.
    """
    message = f"{user_id}:{code}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), message, hashlib.sha256).hexdigest()


def verify_otp(user_id: str, code: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_otp(user_id, code), hashed)
