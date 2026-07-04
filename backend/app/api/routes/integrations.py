"""Tenant-facing integration availability (read-only)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.user import User
from app.schemas.integration import ProviderCategory
from app.services.integrations import provider_info_for_tenant

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/available", response_model=list[ProviderCategory])
def list_available_integrations(
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    """Integrations this tenant is entitled to use (platform-managed keys)."""
    return provider_info_for_tenant(db, tenant_id(user))
