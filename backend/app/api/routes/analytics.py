"""Analytics aggregation routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics import aggregate_analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def analytics(
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    return aggregate_analytics(db, scope=tenant_id(user), days=days)
