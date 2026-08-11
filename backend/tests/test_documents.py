"""Unit tests for upload magic-byte validation (no DB / settings needed)."""

from app.services.documents import verify_magic_bytes


def test_pdf_signature_accepted():
    assert verify_magic_bytes(b"%PDF-1.7\n...", "pdf") is True


def test_pdf_rejects_non_pdf():
    assert verify_magic_bytes(b"not a pdf", "pdf") is False


def test_docx_zip_signature_accepted():
    assert verify_magic_bytes(b"PK\x03\x04rest-of-zip", "docx") is True


def test_docx_rejects_plain_text():
    assert verify_magic_bytes(b"hello world", "docx") is False


def test_txt_accepts_utf8():
    assert verify_magic_bytes("héllo".encode("utf-8"), "txt") is True


def test_txt_rejects_binary_with_nul():
    assert verify_magic_bytes(b"abc\x00def", "txt") is False


def test_empty_file_rejected():
    assert verify_magic_bytes(b"", "pdf") is False
