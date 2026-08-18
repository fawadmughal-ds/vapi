"""Bootstrap script: create tables, super admin, and demo data.

Run with:  python -m app.seed
"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password, verify_password
from app.models.enums import UserRole
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voxa.seed")


def create_tables() -> None:
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    logger.info("Tables created/verified.")


def create_super_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.SUPERADMIN_EMAIL.lower()).first()
        if existing:
            # Keep the bootstrap account in sync with SUPERADMIN_PASSWORD in env
            # (seed skips creation for existing rows, so password changes in .env
            # would otherwise leave login broken until a manual DB update).
            if not verify_password(settings.SUPERADMIN_PASSWORD, existing.password_hash):
                existing.password_hash = hash_password(settings.SUPERADMIN_PASSWORD)
                db.commit()
                logger.info("Super admin password synced from env: %s", existing.email)
            else:
                logger.info("Super admin already exists: %s", existing.email)
            return
        admin = User(
            name=settings.SUPERADMIN_NAME,
            email=settings.SUPERADMIN_EMAIL.lower(),
            password_hash=hash_password(settings.SUPERADMIN_PASSWORD),
            role=UserRole.SUPER_ADMIN,
            is_email_verified=True,
        )
        db.add(admin)
        db.commit()
        logger.info("Super admin created: %s", admin.email)
    finally:
        db.close()


def main() -> None:
    create_tables()
    create_super_admin()
    logger.info("Seed complete.")


if __name__ == "__main__":
    main()
