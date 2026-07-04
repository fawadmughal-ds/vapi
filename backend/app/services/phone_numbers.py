"""Shared phone-number provisioning logic for tenant and admin routes."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.phone_number import PhoneNumber
from app.schemas.phone_number import PhoneNumberProvision
from app.services.audit import record_audit
from app.services.voice import VoiceProviderError, voice_provider

logger = logging.getLogger("voxa.phone_numbers")


def build_provider_body(payload: PhoneNumberProvision) -> tuple[dict, str]:
    """Translate the chosen method into a provider payload. Returns (body, provider)."""
    e164 = (payload.e164_number or "").strip()
    body: dict = {}
    if payload.label:
        body["name"] = payload.label

    if payload.method == "vapi_number":
        if not payload.area_code:
            raise HTTPException(status_code=422, detail="An area code is required (US only).")
        body.update({"provider": "vapi", "numberDesiredAreaCode": payload.area_code.strip()})
        return body, "vapi"

    if payload.method == "vapi_sip":
        if not payload.sip_uri:
            raise HTTPException(status_code=422, detail="A SIP URI is required.")
        body.update({"provider": "vapi", "sipUri": payload.sip_uri.strip()})
        return body, "vapi"

    if payload.method == "twilio":
        if not e164:
            raise HTTPException(status_code=422, detail="A phone number is required.")
        account_sid = payload.twilio_account_sid or settings.TWILIO_ACCOUNT_SID
        auth_token = payload.twilio_auth_token or settings.TWILIO_AUTH_TOKEN
        if not account_sid or not auth_token:
            raise HTTPException(
                status_code=422,
                detail="Twilio Account SID and Auth Token are required.",
            )
        body.update({
            "provider": "twilio",
            "number": e164,
            "twilioAccountSid": account_sid,
            "twilioAuthToken": auth_token,
        })
        return body, "twilio"

    if payload.method in ("vonage", "telnyx"):
        if not e164:
            raise HTTPException(status_code=422, detail="A phone number is required.")
        if not payload.credential_id:
            raise HTTPException(
                status_code=422,
                detail=f"A {payload.method.title()} credential is required. "
                       "Connect it under Admin → Integrations first.",
            )
        body.update({
            "provider": payload.method,
            "number": e164,
            "credentialId": payload.credential_id,
        })
        return body, payload.method

    if payload.method == "byo_sip":
        if not payload.credential_id:
            raise HTTPException(
                status_code=422,
                detail="A SIP trunk credential is required. "
                       "Connect it under Admin → Integrations first.",
            )
        body.update({"provider": "byo-phone-number", "credentialId": payload.credential_id})
        if e164:
            body["number"] = e164
        return body, "byo-phone-number"

    raise HTTPException(status_code=422, detail="Unknown method")


async def provision_phone_number(
    db: Session,
    user_id: str,
    payload: PhoneNumberProvision,
    *,
    audit_user_id: str,
    audit_action: str = "phone.add",
) -> PhoneNumber:
    """Provision a number via the platform voice provider and assign it to a tenant."""
    body, provider = build_provider_body(payload)

    try:
        data = await voice_provider.create_phone_number(body)
    except VoiceProviderError as exc:
        logger.warning("Provider rejected phone number (%s): %s", payload.method, exc)
        raise HTTPException(
            status_code=400,
            detail=(
                "The provider could not add this number. Check the details "
                "(area code/number/credentials) and try again."
            ),
        )

    e164 = data.get("number") or payload.e164_number or payload.sip_uri
    if not e164:
        raise HTTPException(status_code=502, detail="Provider did not return a number")

    exists = db.query(PhoneNumber).filter(PhoneNumber.e164_number == e164).first()
    if exists:
        raise HTTPException(status_code=409, detail="This number is already added")

    number = PhoneNumber(
        user_id=user_id,
        e164_number=e164,
        label=payload.label,
        provider=provider,
        country=payload.country,
        vapi_phone_number_id=data.get("id"),
    )
    db.add(number)
    db.commit()
    db.refresh(number)
    record_audit(
        db,
        user_id=audit_user_id,
        action=audit_action,
        resource_type="phone_number",
        resource_id=number.id,
        detail={
            "method": payload.method,
            "provisioned": bool(number.vapi_phone_number_id),
            "assigned_user_id": user_id,
        },
    )
    return number
