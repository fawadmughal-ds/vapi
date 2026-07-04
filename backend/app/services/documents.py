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
