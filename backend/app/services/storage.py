"""File storage abstraction (local filesystem; pluggable for S3)."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from app.core.config import settings

_is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))


class StorageService:
    def __init__(self) -> None:
        # Vercel/Lambda only allow writes under /tmp — creating ./storage at import
        # time on a read-only filesystem crashes the whole function on cold start.
        if _is_serverless:
            self.base_dir = Path("/tmp/storage")
        else:
            self.base_dir = Path(settings.STORAGE_LOCAL_DIR)

    def _ensure_dir(self, path: Path | None = None) -> None:
        target = path or self.base_dir
        target.mkdir(parents=True, exist_ok=True)

    def save(self, *, user_id: str, file_name: str, content: bytes) -> tuple[str, int]:
        """Persist a file and return (relative_path, size_bytes)."""
        self._ensure_dir()
        safe_name = f"{uuid.uuid4().hex}_{os.path.basename(file_name)}"
        user_dir = self.base_dir / user_id
        self._ensure_dir(user_dir)
        full_path = user_dir / safe_name
        full_path.write_bytes(content)
        rel = str(full_path.relative_to(self.base_dir))
        return rel, len(content)

    def read(self, rel_path: str) -> bytes:
        return (self.base_dir / rel_path).read_bytes()

    def delete(self, rel_path: str) -> None:
        target = self.base_dir / rel_path
        if target.exists():
            target.unlink()


storage_service = StorageService()
