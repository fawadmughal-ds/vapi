"""Outbound campaign routes: create, list, upload contacts, and launch."""

from __future__ import annotations

import csv
import io
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.call import Call
from app.models.campaign import Campaign, CampaignContact
from app.models.enums import (
    CallDirection,
    CallStatus,
    CampaignStatus,
    ContactStatus,
)
from app.models.phone_number import PhoneNumber
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate,
    CampaignPublic,
    ContactPublic,
    ContactUpload,
    LaunchResult,
)
from app.services.audit import record_audit
from app.services.billing import ensure_subscription
from app.services.credits import platform_has_capacity
from app.services.voice import voice_provider

logger = logging.getLogger("voxa.campaigns")

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

# Safety cap: how many calls a single launch request may place.
MAX_CALLS_PER_LAUNCH = 50


def _counts(db: Session, campaign_id: str) -> dict[str, int]:
    rows = db.execute(
        select(CampaignContact.status, func.count())
        .where(CampaignContact.campaign_id == campaign_id)
        .group_by(CampaignContact.status)
    ).all()
    by_status = {status: count for status, count in rows}
    total = sum(by_status.values())
    return {
        "total_contacts": total,
        "called_contacts": by_status.get(ContactStatus.CALLED, 0),
        "pending_contacts": by_status.get(ContactStatus.PENDING, 0),
        "failed_contacts": by_status.get(ContactStatus.FAILED, 0),
    }


def _to_public(db: Session, campaign: Campaign) -> CampaignPublic:
    data = CampaignPublic.model_validate(campaign)
    agent = db.get(Agent, campaign.agent_id) if campaign.agent_id else None
    data.agent_name = agent.name if agent else None
    if campaign.phone_number_id:
        number = db.get(PhoneNumber, campaign.phone_number_id)
        if number:
            data.phone_number = number.label or number.e164_number
    counts = _counts(db, campaign.id)
    data.total_contacts = counts["total_contacts"]
    data.called_contacts = counts["called_contacts"]
    data.pending_contacts = counts["pending_contacts"]
    data.failed_contacts = counts["failed_contacts"]
    return data


def _get_owned_campaign(db: Session, campaign_id: str, user: User) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    if not campaign or campaign.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("", response_model=list[CampaignPublic])
def list_campaigns(user: User = Depends(get_verified_user),
                   db: Session = Depends(get_db)):
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.user_id == tenant_id(user))
        .order_by(Campaign.created_at.desc())
        .all()
    )
    return [_to_public(db, c) for c in campaigns]


@router.post("", response_model=CampaignPublic, status_code=201)
def create_campaign(payload: CampaignCreate,
                    user: User = Depends(get_verified_user),
                    db: Session = Depends(get_db)):
    agent = db.get(Agent, payload.agent_id)
    if not agent or agent.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Agent not found")

    if payload.phone_number_id:
        number = db.get(PhoneNumber, payload.phone_number_id)
        if not number or number.user_id != tenant_id(user):
            raise HTTPException(status_code=404, detail="Phone number not found")

    campaign = Campaign(
        user_id=tenant_id(user),
        agent_id=agent.id,
        phone_number_id=payload.phone_number_id,
        name=payload.name.strip(),
        status=CampaignStatus.DRAFT,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    record_audit(db, user_id=user.id, action="campaign.create",
                 resource_type="campaign", resource_id=campaign.id)
    return _to_public(db, campaign)


@router.get("/{campaign_id}", response_model=CampaignPublic)
def get_campaign(campaign_id: str, user: User = Depends(get_verified_user),
                 db: Session = Depends(get_db)):
    campaign = _get_owned_campaign(db, campaign_id, user)
    return _to_public(db, campaign)


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: str, user: User = Depends(get_verified_user),
                    db: Session = Depends(get_db)):
    campaign = _get_owned_campaign(db, campaign_id, user)
    db.delete(campaign)
    db.commit()
    record_audit(db, user_id=user.id, action="campaign.delete",
                 resource_type="campaign", resource_id=campaign_id)


@router.get("/{campaign_id}/contacts", response_model=list[ContactPublic])
def list_contacts(campaign_id: str, user: User = Depends(get_verified_user),
                  db: Session = Depends(get_db)):
    _get_owned_campaign(db, campaign_id, user)
    contacts = (
        db.query(CampaignContact)
        .filter(CampaignContact.campaign_id == campaign_id)
        .order_by(CampaignContact.created_at.asc())
        .all()
    )
    return [ContactPublic.model_validate(c) for c in contacts]


def _normalize_phone(raw: str) -> str | None:
    """Keep leading + and digits; reject anything without enough digits."""
    raw = (raw or "").strip()
    if not raw:
        return None
    plus = raw.startswith("+")
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) < 7:
        return None
    return ("+" + digits) if plus else digits


def _add_contacts(db: Session, campaign: Campaign,
                  rows: list[tuple[str | None, str]]) -> int:
    """Insert (name, phone) rows, de-duplicating against existing phones."""
    existing = {
        c.phone
        for c in db.query(CampaignContact.phone)
        .filter(CampaignContact.campaign_id == campaign.id)
        .all()
    }
    added = 0
    for name, phone in rows:
        norm = _normalize_phone(phone)
        if not norm or norm in existing:
            continue
        existing.add(norm)
        db.add(CampaignContact(
            campaign_id=campaign.id,
            name=(name or "").strip() or None,
            phone=norm,
            status=ContactStatus.PENDING,
        ))
        added += 1
    if added:
        db.commit()
    return added


@router.post("/{campaign_id}/contacts", response_model=CampaignPublic)
def add_contacts_json(campaign_id: str, payload: ContactUpload,
                      user: User = Depends(get_verified_user),
                      db: Session = Depends(get_db)):
    campaign = _get_owned_campaign(db, campaign_id, user)
    rows = [(c.name, c.phone) for c in payload.contacts]
    added = _add_contacts(db, campaign, rows)
    if added == 0:
        raise HTTPException(
            status_code=400,
            detail="No valid new contacts found. Check phone numbers and duplicates.",
        )
    record_audit(db, user_id=user.id, action="campaign.contacts.add",
                 resource_type="campaign", resource_id=campaign.id,
                 detail={"added": added})
    db.refresh(campaign)
    return _to_public(db, campaign)


@router.post("/{campaign_id}/contacts/upload", response_model=CampaignPublic)
async def upload_contacts_csv(campaign_id: str,
                              file: UploadFile = File(...),
                              user: User = Depends(get_verified_user),
                              db: Session = Depends(get_db)):
    campaign = _get_owned_campaign(db, campaign_id, user)

    raw = await file.read()
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 2MB).")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV.")

    reader = csv.reader(io.StringIO(text))
    rows_raw = [r for r in reader if any((cell or "").strip() for cell in r)]
    if not rows_raw:
        raise HTTPException(status_code=400, detail="The file is empty.")

    # Detect header: figure out which column holds the phone / name.
    header = [c.strip().lower() for c in rows_raw[0]]
    phone_idx, name_idx = 0, None
    has_header = any(h in ("phone", "number", "phone_number", "mobile", "tel")
                     for h in header) or any(h in ("name", "contact", "full_name")
                                             for h in header)
    if has_header:
        for i, h in enumerate(header):
            if h in ("phone", "number", "phone_number", "mobile", "tel"):
                phone_idx = i
            elif h in ("name", "contact", "full_name"):
                name_idx = i
        data_rows = rows_raw[1:]
    else:
        # No header: assume [name, phone] or single [phone] column.
        if len(rows_raw[0]) >= 2:
            name_idx, phone_idx = 0, 1
        else:
            phone_idx = 0
        data_rows = rows_raw

    rows: list[tuple[str | None, str]] = []
    for r in data_rows:
        if phone_idx >= len(r):
            continue
        phone = r[phone_idx]
        name = r[name_idx] if name_idx is not None and name_idx < len(r) else None
        rows.append((name, phone))

    added = _add_contacts(db, campaign, rows)
    if added == 0:
        raise HTTPException(
            status_code=400,
            detail="No valid new contacts found. Ensure the file has a phone "
                   "column with valid numbers.",
        )
    record_audit(db, user_id=user.id, action="campaign.contacts.upload",
                 resource_type="campaign", resource_id=campaign.id,
                 detail={"added": added})
    db.refresh(campaign)
    return _to_public(db, campaign)


@router.post("/{campaign_id}/launch", response_model=LaunchResult)
async def launch_campaign(campaign_id: str,
                          user: User = Depends(get_verified_user),
                          db: Session = Depends(get_db)):
    campaign = _get_owned_campaign(db, campaign_id, user)

    sub = ensure_subscription(db, tenant_id(user))
    if not sub.has_quota:
        raise HTTPException(
            status_code=402,
            detail="Credit balance exhausted. Upgrade your plan or add credits.",
        )
    if not platform_has_capacity(db):
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable. Please try again later.",
        )

    agent = db.get(Agent, campaign.agent_id)
    if not agent or not agent.vapi_assistant_id:
        raise HTTPException(
            status_code=400,
            detail="Publish the campaign's agent before launching.",
        )

    phone_vapi_id = None
    if campaign.phone_number_id:
        number = db.get(PhoneNumber, campaign.phone_number_id)
        if number and number.vapi_phone_number_id:
            phone_vapi_id = number.vapi_phone_number_id
    if not phone_vapi_id:
        number = (
            db.query(PhoneNumber)
            .filter(
                PhoneNumber.user_id == tenant_id(user),
                PhoneNumber.vapi_phone_number_id.isnot(None),
            )
            .first()
        )
        phone_vapi_id = number.vapi_phone_number_id if number else None
    if not phone_vapi_id:
        raise HTTPException(
            status_code=400,
            detail="You need an active phone number to launch. Add or provision a "
                   "number on the Phone Numbers page first.",
        )

    pending = (
        db.query(CampaignContact)
        .filter(
            CampaignContact.campaign_id == campaign.id,
            CampaignContact.status == ContactStatus.PENDING,
        )
        .order_by(CampaignContact.created_at.asc())
        .limit(MAX_CALLS_PER_LAUNCH)
        .all()
    )
    if not pending:
        raise HTTPException(status_code=400, detail="No pending contacts to call.")

    queued = 0
    failed = 0
    campaign.status = CampaignStatus.RUNNING
    db.commit()

    for contact in pending:
        try:
            result = await voice_provider.create_outbound_call(
                agent.vapi_assistant_id, contact.phone, phone_vapi_id
            )
            call = Call(
                user_id=tenant_id(user),
                agent_id=agent.id,
                vapi_call_id=result.get("id"),
                direction=CallDirection.OUTBOUND,
                status=CallStatus.QUEUED,
                callee_number=contact.phone,
            )
            db.add(call)
            db.flush()
            contact.status = ContactStatus.CALLED
            contact.call_id = call.id
            contact.error = None
            queued += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning("Campaign %s call to %s failed: %s",
                           campaign.id, contact.phone, exc)
            contact.status = ContactStatus.FAILED
            contact.error = "Call could not be placed."
            failed += 1
        db.commit()

    remaining = (
        db.query(CampaignContact)
        .filter(
            CampaignContact.campaign_id == campaign.id,
            CampaignContact.status == ContactStatus.PENDING,
        )
        .count()
    )
    campaign.status = (
        CampaignStatus.RUNNING if remaining else CampaignStatus.COMPLETED
    )
    db.commit()

    record_audit(db, user_id=user.id, action="campaign.launch",
                 resource_type="campaign", resource_id=campaign.id,
                 detail={"queued": queued, "failed": failed})

    detail = f"Queued {queued} call(s)."
    if failed:
        detail += f" {failed} failed."
    if remaining:
        detail += f" {remaining} contact(s) remaining — launch again to continue."
    return LaunchResult(queued=queued, failed=failed, skipped=remaining, detail=detail)
