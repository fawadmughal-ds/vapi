"""Tenant-wide tool library — an aggregate view of tools across all agents.

Per-agent tool CRUD lives in :mod:`app.api.routes.tools`. This router exposes a
flat, cross-agent listing (like Vapi's Tools tab) plus the tool catalog.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.tool import AgentTool
from app.models.user import User
from app.schemas.tool import ToolPublic
from app.services.agent_catalog import tool_catalog_grouped

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/catalog")
def catalog(_: User = Depends(get_verified_user)):
    """The full catalog of tools that can be added to an agent."""
    return tool_catalog_grouped()


@router.get("", response_model=list[ToolPublic])
def list_all_tools(user: User = Depends(get_verified_user),
                   db: Session = Depends(get_db)):
    """Every tool configured across this tenant's agents."""
    rows = db.execute(
        select(AgentTool, Agent.name)
        .join(Agent, AgentTool.agent_id == Agent.id)
        .where(Agent.user_id == tenant_id(user))
        .order_by(AgentTool.created_at.desc())
    ).all()
    result: list[ToolPublic] = []
    for tool, agent_name in rows:
        data = ToolPublic.model_validate(tool)
        data.agent_name = agent_name
        result.append(data)
    return result
