"""AI Agent management routes (the create wizard happens client-side; this is the API)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.enums import AgentStatus
from app.models.user import User
from app.core.config import settings
from app.schemas.agent import (
    AgentCreate,
    AgentPublic,
    AgentUpdate,
    VoiceOption,
    WebCallConfig,
)
from app.services.agent_catalog import (
    FIRST_MESSAGE_MODES,
    model_catalog_dicts,
    tool_catalog_grouped,
    transcriber_catalog_dicts,
)
from app.services import vapi_sync
from app.services.audit import record_audit
from app.services.billing import ensure_subscription
from app.services.tts import TTSUnavailable, synthesize_preview
from app.services.voice import voice_provider
from app.services.voices import LANGUAGE_CATALOG, VOICE_CATALOG

router = APIRouter(prefix="/agents", tags=["agents"])


def _to_public(agent: Agent) -> AgentPublic:
    data = AgentPublic.model_validate(agent)
    data.is_provisioned = bool(agent.vapi_assistant_id)
    return data


@router.get("/voices", response_model=list[VoiceOption])
def list_voices(_: User = Depends(get_verified_user)):
    return VOICE_CATALOG


@router.get("/voices/{voice_id}/preview")
async def preview_voice(voice_id: str, _: User = Depends(get_verified_user)):
    """Stream a short audio sample of a voice (mp3).

    Returns 503 when no TTS provider is configured so the client can fall back
    to a local browser preview.
    """
    if not any(v.id == voice_id for v in VOICE_CATALOG):
        raise HTTPException(status_code=404, detail="Voice not found")
    try:
        audio = await synthesize_preview(voice_id)
    except TTSUnavailable:
        raise HTTPException(status_code=503, detail="Voice preview is not available")
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/languages")
def list_languages(_: User = Depends(get_verified_user)):
    return LANGUAGE_CATALOG


@router.get("/models")
def list_models(_: User = Depends(get_verified_user)):
    return model_catalog_dicts()


@router.get("/transcribers")
def list_transcribers(_: User = Depends(get_verified_user)):
    return transcriber_catalog_dicts()


@router.get("/first-message-modes")
def list_first_message_modes(_: User = Depends(get_verified_user)):
    return FIRST_MESSAGE_MODES


@router.get("/tool-catalog")
def list_tool_catalog(_: User = Depends(get_verified_user)):
    return tool_catalog_grouped()


@router.get("", response_model=list[AgentPublic])
def list_agents(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Agent).where(Agent.user_id == tenant_id(user)).order_by(Agent.created_at.desc())
    ).all()
    return [_to_public(a) for a in rows]


@router.post("/sync", response_model=list[AgentPublic])
async def sync_agents(user: User = Depends(get_verified_user),
                      db: Session = Depends(get_db)):
    """Import assistants that exist in the provider org into this account."""
    await vapi_sync.sync_agents(db, tenant_id(user))
    record_audit(db, user_id=user.id, action="agent.sync", resource_type="agent")
    rows = db.scalars(
        select(Agent).where(Agent.user_id == tenant_id(user)).order_by(Agent.created_at.desc())
    ).all()
    return [_to_public(a) for a in rows]


@router.post("", response_model=AgentPublic, status_code=201)
def create_agent(
    payload: AgentCreate,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    agent = Agent(user_id=tenant_id(user), **payload.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    record_audit(db, user_id=user.id, action="agent.create", resource_type="agent",
                 resource_id=agent.id)
    return _to_public(agent)


def _get_owned_agent(agent_id: str, user: User, db: Session) -> Agent:
    agent = db.get(Agent, agent_id)
    if not agent or agent.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/{agent_id}", response_model=AgentPublic)
def get_agent(agent_id: str, user: User = Depends(get_verified_user),
              db: Session = Depends(get_db)):
    return _to_public(_get_owned_agent(agent_id, user, db))


@router.get("/{agent_id}/web-call", response_model=WebCallConfig)
def get_web_call_config(agent_id: str, user: User = Depends(get_verified_user),
                        db: Session = Depends(get_db)):
    """Return credentials for an in-browser voice session with this agent."""
    agent = _get_owned_agent(agent_id, user, db)
    if not agent.vapi_assistant_id:
        raise HTTPException(status_code=400, detail="Publish the agent before talking to it")
    sub = ensure_subscription(db, tenant_id(user))
    if not sub.has_quota:
        raise HTTPException(
            status_code=402,
            detail="Credit balance exhausted. Contact your administrator to add more credits.",
        )
    if not settings.VAPI_PUBLIC_KEY:
        raise HTTPException(
            status_code=503,
            detail="In-browser calling isn't configured. Add a public key in settings.",
        )
    return WebCallConfig(
        public_key=settings.VAPI_PUBLIC_KEY,
        assistant_id=agent.vapi_assistant_id,
    )


@router.patch("/{agent_id}", response_model=AgentPublic)
async def update_agent(
    agent_id: str,
    payload: AgentUpdate,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    agent = _get_owned_agent(agent_id, user, db)
    data = payload.model_dump(exclude_unset=True)
    # A generic PATCH must not "publish" an agent — publishing provisions the
    # upstream assistant and only happens via POST /{id}/publish. Allow marking
    # PUBLISHED only if the agent is already provisioned upstream.
    if (
        data.get("status") == AgentStatus.PUBLISHED
        and not agent.vapi_assistant_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Use the publish action to publish an agent.",
        )
    for field, value in data.items():
        setattr(agent, field, value)
    db.commit()
    db.refresh(agent)

    # Keep the upstream assistant in sync if already provisioned.
    if agent.vapi_assistant_id:
        await voice_provider.update_assistant(agent.vapi_assistant_id, agent)

    record_audit(db, user_id=user.id, action="agent.update", resource_type="agent",
                 resource_id=agent.id)
    return _to_public(agent)


@router.post("/{agent_id}/publish", response_model=AgentPublic)
async def publish_agent(
    agent_id: str,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    """Final wizard step: provision the assistant with the voice provider."""
    agent = _get_owned_agent(agent_id, user, db)
    if not agent.system_prompt.strip():
        raise HTTPException(status_code=400, detail="A system prompt is required to publish")

    if agent.vapi_assistant_id:
        await voice_provider.update_assistant(agent.vapi_assistant_id, agent)
    else:
        agent.vapi_assistant_id = await voice_provider.create_assistant(agent)

    agent.status = AgentStatus.PUBLISHED
    db.commit()
    db.refresh(agent)
    record_audit(db, user_id=user.id, action="agent.publish", resource_type="agent",
                 resource_id=agent.id)
    return _to_public(agent)


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: str, user: User = Depends(get_verified_user),
                       db: Session = Depends(get_db)):
    agent = _get_owned_agent(agent_id, user, db)
    if agent.vapi_assistant_id:
        await voice_provider.delete_assistant(agent.vapi_assistant_id)
    db.delete(agent)
    db.commit()
    record_audit(db, user_id=user.id, action="agent.delete", resource_type="agent",
                 resource_id=agent_id)
