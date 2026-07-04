"""Dynamic function-calling tool management (per agent)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.tool import AgentTool
from app.models.user import User
from app.schemas.tool import ToolCreate, ToolPublic, ToolUpdate
from app.services.agent_catalog import TOOL_BY_ID
from app.services.voice import voice_provider

router = APIRouter(prefix="/agents/{agent_id}/tools", tags=["tools"])

# Legacy function handlers still executable by the webhook, kept for back-compat
# alongside the catalog tool ids in ``TOOL_BY_ID``.
LEGACY_HANDLERS = {
    "create_order",
    "book_appointment",
    "create_lead",
    "send_email",
    "check_status",
    "generic",
}


def _valid_handler(handler: str) -> bool:
    return handler in TOOL_BY_ID or handler in LEGACY_HANDLERS


def _owned_agent(agent_id: str, user: User, db: Session) -> Agent:
    agent = db.get(Agent, agent_id)
    if not agent or agent.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


async def _resync(agent: Agent) -> None:
    """Push tool changes to the upstream assistant if already provisioned."""
    if agent.vapi_assistant_id:
        await voice_provider.update_assistant(agent.vapi_assistant_id, agent)


@router.get("", response_model=list[ToolPublic])
def list_tools(agent_id: str, user: User = Depends(get_verified_user),
               db: Session = Depends(get_db)):
    _owned_agent(agent_id, user, db)
    return db.scalars(select(AgentTool).where(AgentTool.agent_id == agent_id)).all()


@router.post("", response_model=ToolPublic, status_code=201)
async def create_tool(agent_id: str, payload: ToolCreate,
                      user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    agent = _owned_agent(agent_id, user, db)
    if not _valid_handler(payload.handler):
        raise HTTPException(status_code=400, detail="Unknown tool type")
    tool = AgentTool(agent_id=agent_id, **payload.model_dump())
    db.add(tool)
    db.commit()
    db.refresh(tool)
    db.refresh(agent)
    try:
        await _resync(agent)
    except Exception:
        # Keep local state consistent with upstream: undo the add if the
        # provider rejected the tool set, then surface the error.
        db.delete(tool)
        db.commit()
        raise
    return tool


@router.patch("/{tool_id}", response_model=ToolPublic)
async def update_tool(agent_id: str, tool_id: str, payload: ToolUpdate,
                      user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    agent = _owned_agent(agent_id, user, db)
    tool = db.get(AgentTool, tool_id)
    if not tool or tool.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Tool not found")
    if payload.handler is not None and not _valid_handler(payload.handler):
        raise HTTPException(status_code=400, detail="Unknown tool type")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tool, field, value)
    db.commit()
    db.refresh(tool)
    db.refresh(agent)
    await _resync(agent)
    return tool


@router.delete("/{tool_id}", status_code=204)
async def delete_tool(agent_id: str, tool_id: str,
                      user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    agent = _owned_agent(agent_id, user, db)
    tool = db.get(AgentTool, tool_id)
    if not tool or tool.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Tool not found")
    db.delete(tool)
    db.commit()
    db.refresh(agent)
    await _resync(agent)
