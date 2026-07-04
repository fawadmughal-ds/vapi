"""Phone number management routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.enums import PhoneNumberStatus
from app.models.phone_number import PhoneNumber
from app.models.user import User
from app.schemas.phone_number import (
    PhoneNumberAssign,
    PhoneNumberProvision,
    PhoneNumberPublic,
)
from app.services.audit import record_audit
from app.services.phone_numbers import provision_phone_number
from app.services.voice import voice_provider

router = APIRouter(prefix="/phone-numbers", tags=["phone-numbers"])


@router.get("", response_model=list[PhoneNumberPublic])
def list_numbers(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(PhoneNumber)
        .where(PhoneNumber.user_id == tenant_id(user))
        .order_by(PhoneNumber.created_at.desc())
    ).all()


@router.post("/sync", response_model=list[PhoneNumberPublic])
async def sync_numbers(
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    """Import numbers that already exist in the provider org into this account.

    Covers the free number every org gets plus any bought/imported numbers, so
    they show up here and become usable for calls immediately.
    """
    remote = await voice_provider.list_phone_numbers()
    imported = 0
    for item in remote:
        vapi_id = item.get("id")
        e164 = item.get("number")
        if not vapi_id or not e164:
            continue
        existing = db.scalar(
            select(PhoneNumber).where(
                or_(
                    PhoneNumber.vapi_phone_number_id == vapi_id,
                    PhoneNumber.e164_number == e164,
                )
            )
        )
        if existing:
            # Never mutate another tenant's row when reconciling a shared provider org.
            if existing.user_id != tenant_id(user):
                continue
            # Backfill the provider id so an unprovisioned row becomes active.
            if not existing.vapi_phone_number_id:
                existing.vapi_phone_number_id = vapi_id
            continue
        db.add(
            PhoneNumber(
                user_id=tenant_id(user),
                e164_number=e164,
                label=item.get("name"),
                provider=item.get("provider") or "vapi",
                vapi_phone_number_id=vapi_id,
                status=PhoneNumberStatus.AVAILABLE,
            )
        )
        imported += 1

    db.commit()
    record_audit(db, user_id=user.id, action="phone.sync", resource_type="phone_number",
                 resource_id=None, detail={"imported": imported})
    return db.scalars(
        select(PhoneNumber)
        .where(PhoneNumber.user_id == tenant_id(user))
        .order_by(PhoneNumber.created_at.desc())
    ).all()


@router.post("", response_model=PhoneNumberPublic, status_code=201)
async def add_number(
    payload: PhoneNumberProvision,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    return await provision_phone_number(
        db, tenant_id(user), payload, audit_user_id=user.id
    )


def _get_owned_number(number_id: str, user: User, db: Session) -> PhoneNumber:
    number = db.get(PhoneNumber, number_id)
    if not number or number.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Phone number not found")
    return number


@router.post("/{number_id}/assign", response_model=PhoneNumberPublic)
async def assign_number(
    number_id: str,
    payload: PhoneNumberAssign,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    number = _get_owned_number(number_id, user, db)
    assistant_id = None
    if payload.agent_id:
        agent = db.get(Agent, payload.agent_id)
        if not agent or agent.user_id != tenant_id(user):
            raise HTTPException(status_code=404, detail="Agent not found")
        assistant_id = agent.vapi_assistant_id
        number.agent_id = agent.id
        number.status = PhoneNumberStatus.ASSIGNED
    else:
        number.agent_id = None
        number.status = PhoneNumberStatus.AVAILABLE

    if number.vapi_phone_number_id:
        await voice_provider.update_phone_number(number.vapi_phone_number_id, assistant_id)

    db.commit()
    db.refresh(number)
    record_audit(db, user_id=user.id, action="phone.assign", resource_type="phone_number",
                 resource_id=number.id, detail={"agent_id": payload.agent_id})
    return number


@router.delete("/{number_id}", status_code=204)
async def remove_number(number_id: str, user: User = Depends(get_verified_user),
                        db: Session = Depends(get_db)):
    number = _get_owned_number(number_id, user, db)
    if number.vapi_phone_number_id:
        await voice_provider.release_phone_number(number.vapi_phone_number_id)
    db.delete(number)
    db.commit()
    record_audit(db, user_id=user.id, action="phone.remove", resource_type="phone_number",
                 resource_id=number_id)
