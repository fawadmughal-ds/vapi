"""Public contact / sales-inquiry endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from app.schemas.common import Message
from app.schemas.contact import ContactRequest
from app.services.email import email_service

logger = logging.getLogger("voxa.contact")

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=Message)
def submit_contact(request: Request, payload: ContactRequest):
    """Deliver a contact-form submission to the support inbox.

    Sends the inquiry to the team (with Reply-To set to the sender) and fires a
    best-effort acknowledgement back to the sender.
    """
    details: list[tuple[str, str]] = []
    if payload.company:
        details.append(("Company", payload.company))
    if payload.inquiry_type:
        details.append(("Inquiry type", payload.inquiry_type))
    if payload.company_size:
        details.append(("Company size", payload.company_size))
    if payload.call_volume:
        details.append(("Monthly call volume", payload.call_volume))
    if payload.provider:
        details.append(("Current provider", payload.provider))

    try:
        email_service.send_contact_inquiry(
            name=payload.name,
            email=payload.email,
            message=payload.message,
            details=details,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Contact form delivery failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="We couldn't send your message right now. Please email info@nextcall.online directly.",
        ) from exc

    # Acknowledgement to the sender is best-effort; never fail the request on it.
    try:
        email_service.send_contact_ack(to=payload.email, name=payload.name)
    except Exception:  # noqa: BLE001
        pass

    return Message(detail="Thanks for reaching out — we'll get back to you shortly.")
