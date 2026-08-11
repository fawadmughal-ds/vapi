"""Test bootstrap: provide safe defaults so importing app settings never fails.

These are set before any ``app.*`` import so pydantic settings validation
(which is strict in production) has usable, non-secret values in CI/local test
runs.
"""

import os

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault(
    "SECRET_KEY", "test-secret-key-not-for-production-0123456789abcdef"
)
os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://voxa:voxa@localhost:5432/voxaai_test"
)
