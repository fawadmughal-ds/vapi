"""Unit tests for JWT + password + OTP helpers (PyJWT-backed)."""

from app.core.security import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_otp,
    hash_password,
    verify_otp,
    verify_password,
)


def test_access_token_roundtrip():
    token = create_access_token("user-123", "customer")
    data = decode_token(token)
    assert data is not None
    assert data["sub"] == "user-123"
    assert data["role"] == "customer"


def test_refresh_token_marked_as_refresh():
    token = create_refresh_token("user-123")
    data = decode_token(token)
    assert data is not None
    assert data["type"] == REFRESH_TOKEN_TYPE


def test_decode_rejects_garbage():
    assert decode_token("not.a.jwt") is None


def test_password_hash_roundtrip():
    hashed = hash_password("s3cret-pass")
    assert verify_password("s3cret-pass", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_otp_hash_is_bound_to_user_and_verifies():
    code = generate_otp(6)
    assert len(code) == 6 and code.isdigit()
    hashed = hash_otp("user-123", code)
    assert verify_otp("user-123", code, hashed) is True
    # Same code, different user must not verify.
    assert verify_otp("other-user", code, hashed) is False
