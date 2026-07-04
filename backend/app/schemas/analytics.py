"""Analytics schemas."""

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_calls: int
    minutes_used: float
    avg_duration_seconds: float
    total_cost: float
    success_rate: float
    active_agents: int


class TimeSeriesPoint(BaseModel):
    date: str
    calls: int
    minutes: float
    cost: float


class AgentPerformance(BaseModel):
    agent_id: str
    agent_name: str
    calls: int
    minutes: float
    success_rate: float
    avg_duration_seconds: float


class AnalyticsResponse(BaseModel):
    summary: AnalyticsSummary
    calls_per_day: list[TimeSeriesPoint]
    calls_per_month: list[TimeSeriesPoint]
    agent_performance: list[AgentPerformance]
