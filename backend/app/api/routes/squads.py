"""Squad management routes — group agents so they can hand off calls."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.squad import Squad
from app.models.user import User
from app.schemas.squad import SquadCreate, SquadMember, SquadPublic, SquadUpdate
from app.services.audit import record_audit
from app.services.voice import voice_provider

router = APIRouter(prefix="/squads", tags=["squads"])


def _validate_member_ids(db: Session, user: User, agent_ids: list[str] | None) -> None:
    """Reject any agent id that doesn't belong to the caller's tenant.

    Prevents persisting another tenant's agent UUIDs into a squad's metadata.
    """
    if not agent_ids:
        return
    owned = {
        a.id
        for a in db.scalars(
            select(Agent.id).where(
                Agent.id.in_(agent_ids), Agent.user_id == tenant_id(user)
            )
        ).all()
    }
    unknown = [aid for aid in agent_ids if aid not in owned]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail="One or more agents do not exist in your workspace.",
        )


def _agents_for(db: Session, user: User, agent_ids: list[str]) -> list[Agent]:
    if not agent_ids:
        return []
    rows = {
        a.id: a
        for a in db.scalars(
            select(Agent).where(
                Agent.id.in_(agent_ids), Agent.user_id == tenant_id(user)
            )
        ).all()
    }
    # Preserve caller-specified order (primary first).
    return [rows[aid] for aid in agent_ids if aid in rows]


def _to_public(squad: Squad, db: Session, user: User) -> SquadPublic:
    data = SquadPublic.model_validate(squad)
    data.is_provisioned = squad.is_provisioned
    agents = {a.id: a for a in _agents_for(db, user, squad.member_agent_ids or [])}
    data.members = [
        SquadMember(
            agent_id=aid,
            agent_name=agents[aid].name if aid in agents else None,
            is_provisioned=bool(agents[aid].vapi_assistant_id) if aid in agents else False,
        )
        for aid in (squad.member_agent_ids or [])
    ]
    return data


@router.get("", response_model=list[SquadPublic])
def list_squads(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Squad).where(Squad.user_id == tenant_id(user)).order_by(Squad.created_at.desc())
    ).all()
    return [_to_public(s, db, user) for s in rows]


@router.post("", response_model=SquadPublic, status_code=201)
def create_squad(payload: SquadCreate, user: User = Depends(get_verified_user),
                 db: Session = Depends(get_db)):
    _validate_member_ids(db, user, payload.member_agent_ids)
    squad = Squad(
        user_id=tenant_id(user),
        name=payload.name,
        description=payload.description,
        member_agent_ids=payload.member_agent_ids,
    )
    db.add(squad)
    db.commit()
    db.refresh(squad)
    record_audit(db, user_id=user.id, action="squad.create", resource_type="squad",
                 resource_id=squad.id)
    return _to_public(squad, db, user)


def _owned_squad(squad_id: str, user: User, db: Session) -> Squad:
    squad = db.get(Squad, squad_id)
    if not squad or squad.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Squad not found")
    return squad


@router.get("/{squad_id}", response_model=SquadPublic)
def get_squad(squad_id: str, user: User = Depends(get_verified_user),
              db: Session = Depends(get_db)):
    return _to_public(_owned_squad(squad_id, user, db), db, user)


@router.patch("/{squad_id}", response_model=SquadPublic)
async def update_squad(squad_id: str, payload: SquadUpdate,
                       user: User = Depends(get_verified_user),
                       db: Session = Depends(get_db)):
    squad = _owned_squad(squad_id, user, db)
    data = payload.model_dump(exclude_unset=True)
    if "member_agent_ids" in data:
        _validate_member_ids(db, user, data["member_agent_ids"])
    for field, value in data.items():
        setattr(squad, field, value)
    db.commit()
    db.refresh(squad)
    if squad.vapi_squad_id:
        await _sync_upstream(squad, db, user)
    record_audit(db, user_id=user.id, action="squad.update", resource_type="squad",
                 resource_id=squad.id)
    return _to_public(squad, db, user)


async def _sync_upstream(squad: Squad, db: Session, user: User) -> None:
    agents = _agents_for(db, user, squad.member_agent_ids or [])
    members = [(a.vapi_assistant_id, a.name) for a in agents if a.vapi_assistant_id]
    if squad.vapi_squad_id:
        await voice_provider.update_squad(squad.vapi_squad_id, squad.name, members)
    else:
        squad.vapi_squad_id = await voice_provider.create_squad(squad.name, members)
        db.commit()


@router.post("/{squad_id}/publish", response_model=SquadPublic)
async def publish_squad(squad_id: str, user: User = Depends(get_verified_user),
                        db: Session = Depends(get_db)):
    squad = _owned_squad(squad_id, user, db)
    agents = _agents_for(db, user, squad.member_agent_ids or [])
    published = [a for a in agents if a.vapi_assistant_id]
    if len(published) < 1:
        raise HTTPException(
            status_code=400,
            detail="Add at least one published agent to the squad before publishing.",
        )
    await _sync_upstream(squad, db, user)
    db.commit()
    db.refresh(squad)
    record_audit(db, user_id=user.id, action="squad.publish", resource_type="squad",
                 resource_id=squad.id)
    return _to_public(squad, db, user)


@router.delete("/{squad_id}", status_code=204)
async def delete_squad(squad_id: str, user: User = Depends(get_verified_user),
                       db: Session = Depends(get_db)):
    squad = _owned_squad(squad_id, user, db)
    if squad.vapi_squad_id:
        await voice_provider.delete_squad(squad.vapi_squad_id)
    db.delete(squad)
    db.commit()
    record_audit(db, user_id=user.id, action="squad.delete", resource_type="squad",
                 resource_id=squad_id)
