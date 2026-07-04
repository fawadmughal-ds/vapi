"""File storage abstraction (local filesystem; pluggable for S3)."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        self.base_dir = Path(settings.STORAGE_LOCAL_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, *, user_id: str, file_name: str, content: bytes) -> tuple[str, int]:
        """Persist a file and return (relative_path, size_bytes)."""
        safe_name = f"{uuid.uuid4().hex}_{os.path.basename(file_name)}"
        user_dir = self.base_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
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
