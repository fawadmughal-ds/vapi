"""Reusable analytics aggregation, scoped per-tenant or platform-wide."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.call import Call
from app.models.enums import AgentStatus, CallStatus
from app.schemas.analytics import (
    AgentPerformance,
    AnalyticsResponse,
    AnalyticsSummary,
    TimeSeriesPoint,
)


def aggregate_analytics(
    db: Session, scope: Optional[str], days: int = 30
) -> AnalyticsResponse:
    """Build an analytics response.

    ``scope`` is a ``user_id`` to scope to a single tenant, or ``None`` to
    aggregate across the whole platform.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    base = select(Call)
    if scope is not None:
        base = base.where(Call.user_id == scope)
    calls = db.scalars(base).all()
    window_calls = [c for c in calls if c.created_at and c.created_at >= since]

    total_calls = len(window_calls)
    total_seconds = sum(c.duration_seconds for c in window_calls)
    minutes_used = round(total_seconds / 60, 2)
    total_cost = round(sum(c.cost for c in window_calls), 2)
    completed = [c for c in window_calls if c.status == CallStatus.COMPLETED]
    success_rate = round((len(completed) / total_calls) * 100, 1) if total_calls else 0.0
    avg_duration = round(total_seconds / total_calls, 1) if total_calls else 0.0

    active_stmt = select(func.count(Agent.id)).where(
        Agent.status == AgentStatus.PUBLISHED
    )
    if scope is not None:
        active_stmt = active_stmt.where(Agent.user_id == scope)
    active_agents = db.scalar(active_stmt) or 0

    summary = AnalyticsSummary(
        total_calls=total_calls,
        minutes_used=minutes_used,
        avg_duration_seconds=avg_duration,
        total_cost=total_cost,
        success_rate=success_rate,
        active_agents=active_agents,
    )

    per_day: dict[str, list[Call]] = defaultdict(list)
    for c in window_calls:
        per_day[c.created_at.strftime("%Y-%m-%d")].append(c)
    calls_per_day = [
        TimeSeriesPoint(
            date=day,
            calls=len(items),
            minutes=round(sum(i.duration_seconds for i in items) / 60, 2),
            cost=round(sum(i.cost for i in items), 2),
        )
        for day, items in sorted(per_day.items())
    ]

    per_month: dict[str, list[Call]] = defaultdict(list)
    for c in calls:
        if c.created_at:
            per_month[c.created_at.strftime("%Y-%m")].append(c)
    calls_per_month = [
        TimeSeriesPoint(
            date=month,
            calls=len(items),
            minutes=round(sum(i.duration_seconds for i in items) / 60, 2),
            cost=round(sum(i.cost for i in items), 2),
        )
        for month, items in sorted(per_month.items())
    ]

    agents_stmt = select(Agent)
    if scope is not None:
        agents_stmt = agents_stmt.where(Agent.user_id == scope)
    agents = db.scalars(agents_stmt).all()
    agent_perf: list[AgentPerformance] = []
    for agent in agents:
        a_calls = [c for c in window_calls if c.agent_id == agent.id]
        if not a_calls:
            continue
        a_completed = [c for c in a_calls if c.status == CallStatus.COMPLETED]
        a_seconds = sum(c.duration_seconds for c in a_calls)
        agent_perf.append(
            AgentPerformance(
                agent_id=agent.id,
                agent_name=agent.name,
                calls=len(a_calls),
                minutes=round(a_seconds / 60, 2),
                success_rate=round((len(a_completed) / len(a_calls)) * 100, 1),
                avg_duration_seconds=round(a_seconds / len(a_calls), 1),
            )
        )
    agent_perf.sort(key=lambda x: x.calls, reverse=True)

    return AnalyticsResponse(
        summary=summary,
        calls_per_day=calls_per_day,
        calls_per_month=calls_per_month,
        agent_performance=agent_perf,
    )
