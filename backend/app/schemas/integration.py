"""Integration schemas (provider connections managed by the super-admin)."""

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedSchema


class ProviderInfo(BaseModel):
    """A connectable provider from the catalog, with its connection status."""

    id: str
    name: str
    description: str
    category: str
    auth_type: str
    connected: bool = False
    masked_key: Optional[str] = None
    label: Optional[str] = None


class ProviderCategory(BaseModel):
    category: str
    providers: list[ProviderInfo]


class IntegrationConnect(BaseModel):
    api_key: str = Field(min_length=1, max_length=4096)
    label: Optional[str] = Field(default=None, max_length=255)


class IntegrationPublic(TimestampedSchema):
    provider: str
    category: str
    label: Optional[str] = None
    masked_key: Optional[str] = None
    status: str


class TenantProviderEntitlement(BaseModel):
    provider_id: str
    name: str
    category: str
    enabled: bool


class TenantIntegrationsUpdate(BaseModel):
    providers: list["TenantProviderToggle"]


class TenantProviderToggle(BaseModel):
    provider_id: str
    enabled: bool
