"""Aggregate all API routers under the versioned prefix."""

from fastapi import APIRouter

from app.api.routes import (
    admin,
    agents,
    analytics,
    auth,
    billing,
    calls,
    campaigns,
    contact,
    integrations,
    knowledge_base,
    orders,
    phone_numbers,
    settings as settings_routes,
    squads,
    tool_library,
    tools,
    webhooks,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(agents.router)
api_router.include_router(tool_library.router)
api_router.include_router(tools.router)
api_router.include_router(knowledge_base.router)
api_router.include_router(phone_numbers.router)
api_router.include_router(calls.router)
api_router.include_router(campaigns.router)
api_router.include_router(squads.router)
api_router.include_router(analytics.router)
api_router.include_router(billing.router)
api_router.include_router(contact.router)
api_router.include_router(integrations.router)
api_router.include_router(orders.router)
api_router.include_router(settings_routes.router)
api_router.include_router(admin.router)
api_router.include_router(webhooks.router)
