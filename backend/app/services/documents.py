"""Text extraction from uploaded knowledge base documents."""

from __future__ import annotations

import io
import logging

logger = logging.getLogger("voxa.documents")

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def detect_type(filename: str, content_type: str | None) -> str | None:
    if content_type in ALLOWED_TYPES:
        return ALLOWED_TYPES[content_type]
    lower = filename.lower()
    for ext in ALLOWED_EXTENSIONS:
        if lower.endswith(ext):
            return ext.lstrip(".")
    return None


def verify_magic_bytes(content: bytes, file_type: str) -> bool:
    """Confirm the file's real signature matches its declared type.

    MIME/extension can be spoofed, so we sniff the leading bytes:
      - PDF  → ``%PDF``
      - DOCX → ZIP container (``PK\\x03\\x04`` / ``PK\\x05\\x06`` / ``PK\\x07\\x08``)
      - TXT  → must be valid UTF-8 / not binary (no NUL bytes in the head)
    """
    if not content:
        return False
    head = content[:8]
    if file_type == "pdf":
        return head.startswith(b"%PDF")
    if file_type == "docx":
        return head[:2] == b"PK" and head[2:4] in (b"\x03\x04", b"\x05\x06", b"\x07\x08")
    if file_type == "txt":
        # Reject files with NUL bytes in the first chunk (binary masquerading).
        sample = content[:4096]
        if b"\x00" in sample:
            return False
        try:
            sample.decode("utf-8")
        except UnicodeDecodeError:
            # Allow other text encodings but reject clearly-binary payloads.
            return b"\x00" not in sample
        return True
    return False


def extract_text(content: bytes, file_type: str) -> str:
    try:
        if file_type == "txt":
            return content.decode("utf-8", errors="ignore")
        if file_type == "pdf":
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        if file_type == "docx":
            from docx import Document

            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to extract text from %s document", file_type)
    return ""
