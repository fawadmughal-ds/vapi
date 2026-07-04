"""Import existing resources from the voice provider (Vapi) into the platform.

The platform is normally the source of truth (it creates assistants, numbers and
calls upstream). But an org may already have resources created directly in the
Vapi dashboard, or rows may drift out of sync. These helpers pull the upstream
state and reconcile it into our database so the admin console reflects reality.

Everything here is idempotent: running a sync twice imports nothing new the
second time, it only backfills missing links.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.call import Call
from app.models.enums import AgentStatus, CallDirection, CallStatus
from app.models.integration import Integration
from app.services.integrations import CATALOG_BY_ID
from app.services.voice import voice_provider

logger = logging.getLogger("voxa.sync")

# Reverse map: infra provider slug (as Vapi reports it) -> our catalog id.
_INFRA_TO_CATALOG: dict[str, str] = {
    spec.infra_provider: spec.id for spec in CATALOG_BY_ID.values()
}

_CALL_STATUS_MAP = {
    "queued": CallStatus.QUEUED,
    "ringing": CallStatus.RINGING,
    "in-progress": CallStatus.IN_PROGRESS,
    "forwarding": CallStatus.IN_PROGRESS,
    "ended": CallStatus.COMPLETED,
}


class SyncResult:
    """Lightweight counter bundle returned by each sync function."""

    def __init__(self) -> None:
        self.imported = 0
        self.updated = 0
        self.total = 0

    def as_dict(self) -> dict[str, int]:
        return {"imported": self.imported, "updated": self.updated, "total": self.total}


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _system_prompt(model: dict[str, Any]) -> str:
    for msg in model.get("messages") or []:
        if msg.get("role") == "system":
            return msg.get("content") or ""
    return ""


async def sync_agents(db: Session, owner_id: str) -> SyncResult:
    """Import upstream assistants as agents owned by ``owner_id``."""
    result = SyncResult()
    remote = await voice_provider.list_assistants()
    result.total = len(remote)
    for item in remote:
        vapi_id = item.get("id")
        if not vapi_id:
            continue
        existing = db.scalar(select(Agent).where(Agent.vapi_assistant_id == vapi_id))
        model = item.get("model") or {}
        voice = item.get("voice") or {}
        transcriber = item.get("transcriber") or {}
        if existing:
            # Only reconcile rows owned by this tenant — the upstream org is shared.
            if existing.user_id == owner_id:
                existing.name = item.get("name") or existing.name
                result.updated += 1
            continue
        db.add(
            Agent(
                user_id=owner_id,
                name=item.get("name") or "Imported agent",
                vapi_assistant_id=vapi_id,
                system_prompt=_system_prompt(model),
                first_message=item.get("firstMessage"),
                voice_provider=voice.get("provider") or "vapi",
                voice_id=voice.get("voiceId") or "",
                language=transcriber.get("language") or "en",
                model=model.get("model") or "gpt-4o-mini",
                status=AgentStatus.PUBLISHED,
            )
        )
        result.imported += 1
    db.commit()
    return result


async def sync_calls(
    db: Session,
    fallback_owner_id: str,
    limit: int = 1000,
    *,
    allow_unmapped_fallback: bool = False,
) -> SyncResult:
    """Import upstream calls, linking them to local agents where possible.

    Unmapped calls (no matching local agent) are skipped by default so a
    tenant-triggered sync never attributes another tenant's upstream traffic.
    Pass ``allow_unmapped_fallback=True`` for admin/global sync that may assign
    orphans to ``fallback_owner_id``.
    """
    result = SyncResult()
    remote = await voice_provider.list_calls(limit)
    result.total = len(remote)

    # Preload agents keyed by upstream assistant id to avoid per-call lookups.
    agents = {
        a.vapi_assistant_id: a
        for a in db.scalars(select(Agent).where(Agent.vapi_assistant_id.isnot(None))).all()
    }

    for item in remote:
        vapi_id = item.get("id")
        if not vapi_id:
            continue
        existing = db.scalar(select(Call).where(Call.vapi_call_id == vapi_id))
        if existing:
            result.updated += 1
            continue

        assistant_id = item.get("assistantId") or (item.get("assistant") or {}).get("id")
        agent = agents.get(assistant_id) if assistant_id else None
        if not agent:
            if not allow_unmapped_fallback:
                logger.debug(
                    "Skipping unmapped call %s (assistant %s)", vapi_id, assistant_id
                )
                continue
            owner_id = fallback_owner_id
        else:
            owner_id = agent.user_id

        customer = item.get("customer") or {}
        is_outbound = item.get("type") == "outboundPhoneCall"
        started = _parse_dt(item.get("startedAt"))
        ended = _parse_dt(item.get("endedAt"))
        duration = 0
        if started and ended:
            duration = int((ended - started).total_seconds())

        db.add(
            Call(
                user_id=owner_id,
                agent_id=agent.id if agent else None,
                vapi_call_id=vapi_id,
                direction=CallDirection.OUTBOUND if is_outbound else CallDirection.INBOUND,
                status=_CALL_STATUS_MAP.get(item.get("status", ""), CallStatus.COMPLETED),
                caller_number=None if is_outbound else customer.get("number"),
                callee_number=customer.get("number") if is_outbound else None,
                duration_seconds=duration,
                cost=float(item.get("cost") or 0.0),
                recording_url=item.get("recordingUrl") or item.get("stereoRecordingUrl"),
                transcript=item.get("transcript"),
                summary=item.get("summary"),
                ended_reason=item.get("endedReason"),
                started_at=started,
                ended_at=ended,
            )
        )
        result.imported += 1
    db.commit()
    return result


async def sync_integrations(db: Session) -> SyncResult:
    """Import upstream provider credentials as connected integrations."""
    result = SyncResult()
    remote = await voice_provider.list_credentials()
    result.total = len(remote)
    for item in remote:
        cred_id = item.get("id")
        infra = item.get("provider")
        catalog_id = _INFRA_TO_CATALOG.get(infra)
        if not cred_id or not catalog_id:
            # Unknown/unsupported provider — skip rather than guess.
            continue
        spec = CATALOG_BY_ID[catalog_id]
        existing = db.scalar(select(Integration).where(Integration.provider == catalog_id))
        if existing:
            if not existing.vapi_credential_id:
                existing.vapi_credential_id = cred_id
            existing.status = "connected"
            result.updated += 1
            continue
        db.add(
            Integration(
                provider=catalog_id,
                category=spec.category,
                label=item.get("name") or spec.name,
                masked_key=None,
                vapi_credential_id=cred_id,
                status="connected",
            )
        )
        result.imported += 1
    db.commit()
    return result


async def sync_all(db: Session, owner_id: str) -> dict[str, dict[str, int]]:
    """Run every sync and return a per-resource summary."""
    agents = await sync_agents(db, owner_id)
    calls = await sync_calls(db, owner_id, allow_unmapped_fallback=True)
    integrations = await sync_integrations(db)
    return {
        "agents": agents.as_dict(),
        "calls": calls.as_dict(),
        "integrations": integrations.as_dict(),
    }
