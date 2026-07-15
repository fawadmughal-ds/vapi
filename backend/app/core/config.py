"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import Annotated, List, Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

_INSECURE_SECRET_KEYS = frozenset({"", "change-me"})
_INSECURE_SUPERADMIN_PASSWORD = "ChangeMe123!"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )

    # App
    PROJECT_NAME: str = "NextCall"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    # Public URL of the frontend app — used to build links in emails.
    FRONTEND_URL: str = "http://localhost:3000"
    # When False, accounts can use the app before verifying their email
    # (verification is still offered as a feature). Set True to enforce it.
    REQUIRE_EMAIL_VERIFICATION: bool = False

    # Database
    DATABASE_URL: str = "postgresql+psycopg://voxa:voxa_password@localhost:5432/voxaai"

    # Security
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    # NoDecode prevents pydantic-settings from JSON-parsing the env value so our
    # validator below can accept a plain comma-separated string.
    BACKEND_CORS_ORIGINS: Annotated[List[str], NoDecode] = ["http://localhost:3000"]

    # Super admin bootstrap
    SUPERADMIN_EMAIL: str = "admin@nextcall.ai"
    SUPERADMIN_PASSWORD: str = "ChangeMe123!"
    SUPERADMIN_NAME: str = "Platform Admin"

    # Voice infrastructure provider (abstraction layer). "vapi" today; the
    # VoiceProvider interface allows swapping this later without code changes.
    VOICE_PROVIDER: str = "vapi"

    # Vapi (internal only)
    VAPI_API_KEY: str = ""
    VAPI_BASE_URL: str = "https://api.vapi.ai"
    VAPI_WEBHOOK_SECRET: str = ""
    # Public/browser key — safe to expose client-side; enables in-browser "Talk".
    VAPI_PUBLIC_KEY: str = ""

    # Providers
    OPENAI_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_GROWTH: str = ""
    STRIPE_PRICE_PRO: str = ""

    # Email
    # If RESEND_API_KEY is set, email is sent via the Resend HTTPS API (works on
    # any host, including Render's free tier which blocks SMTP ports). Otherwise
    # falls back to SMTP using the settings below.
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "no-reply@nextcall.ai"
    EMAIL_FROM_NAME: str = "NextCall"

    # Storage
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "./storage"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json

                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @model_validator(mode="after")
    def reject_insecure_production_defaults(self) -> Self:
        """Fail fast when auth-critical settings still use dev placeholders."""
        if not self.is_production:
            return self
        key = self.SECRET_KEY.strip()
        if key.lower() in _INSECURE_SECRET_KEYS:
            raise ValueError(
                "SECRET_KEY must be set to a secure random value when ENVIRONMENT=production"
            )
        if self.SUPERADMIN_PASSWORD == _INSECURE_SUPERADMIN_PASSWORD:
            raise ValueError(
                "SUPERADMIN_PASSWORD must be changed from the default when ENVIRONMENT=production"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
