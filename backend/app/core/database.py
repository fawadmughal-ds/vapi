"""Database engine, session factory, and declarative base."""

import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger("voxa.db")

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_runtime_schema() -> None:
    """Apply lightweight, idempotent column additions for existing tables.

    ``Base.metadata.create_all`` creates new tables but never alters existing
    ones, so newly added columns on long-lived tables (e.g. the credit wallet on
    ``subscriptions``) are added here. Postgres' ``ADD COLUMN IF NOT EXISTS``
    makes this safe to run on every startup.
    """
    statements = [
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS credit_limit DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS credits_used DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS topup_credits DOUBLE PRECISION NOT NULL DEFAULT 0",
        # One-time backfill: seed credit allowance/usage from legacy minute
        # fields for rows that predate the credit wallet (1 credit = 1 minute).
        "UPDATE subscriptions SET credit_limit = minutes_limit WHERE credit_limit = 0 AND minutes_limit > 0",
        "UPDATE subscriptions SET credits_used = minutes_used WHERE credits_used = 0 AND minutes_used > 0",
        # Voice-provider (Vapi) wallet mirror on platform_settings.
        "ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS provider_balance DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS provider_balance_at TIMESTAMPTZ",
        "ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS provider_currency VARCHAR(8) NOT NULL DEFAULT 'USD'",
        # Hot-path indexes for webhook/billing lookups (create_all won't add
        # indexes to pre-existing tables). Idempotent via IF NOT EXISTS.
        "CREATE INDEX IF NOT EXISTS ix_agents_vapi_assistant_id ON agents (vapi_assistant_id)",
        "CREATE INDEX IF NOT EXISTS ix_users_stripe_customer_id ON users (stripe_customer_id)",
        "CREATE INDEX IF NOT EXISTS ix_subscriptions_stripe_subscription_id ON subscriptions (stripe_subscription_id)",
        "CREATE INDEX IF NOT EXISTS ix_calls_user_created ON calls (user_id, created_at)",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Runtime schema step skipped: %s (%s)", stmt, exc)
