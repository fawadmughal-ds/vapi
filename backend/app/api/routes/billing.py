"""Billing & subscription routes (Stripe)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.user import User
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    PlanInfo,
    SubscriptionPublic,
)
from app.services.audit import record_audit
from app.services.billing import ensure_subscription
from app.services.credits import get_platform_settings
from app.services.plans import list_published_plans
from app.services.stripe_service import stripe_service

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=list[PlanInfo])
def list_plans(db: Session = Depends(get_db)):
    return list_published_plans(db)


@router.get("/subscription", response_model=SubscriptionPublic)
def get_subscription(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    sub = ensure_subscription(db, tenant_id(user))
    rate = get_platform_settings(db).minutes_per_credit or 1.0
    return SubscriptionPublic(
        id=sub.id,
        plan=sub.plan,
        status=sub.status,
        minutes_limit=sub.minutes_limit,
        minutes_used=sub.minutes_used,
        minutes_remaining=sub.minutes_remaining,
        credit_limit=sub.credit_limit,
        credits_used=sub.credits_used,
        topup_credits=sub.topup_credits,
        credits_remaining=sub.credits_remaining,
        minutes_per_credit=rate,
        minutes_balance=round(sub.credits_remaining * rate, 2),
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
    )


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    user.stripe_customer_id = stripe_service.ensure_customer(
        email=user.email, name=user.name, existing_id=user.stripe_customer_id
    )
    db.commit()

    frontend = settings.FRONTEND_URL.rstrip("/")
    url = stripe_service.create_checkout_session(
        customer_id=user.stripe_customer_id,
        plan=payload.plan,
        success_url=payload.success_url or f"{frontend}/billing?status=success",
        cancel_url=payload.cancel_url or f"{frontend}/billing?status=cancelled",
        client_reference_id=user.id,
    )
    record_audit(db, user_id=user.id, action="billing.checkout", resource_type="subscription",
                 detail={"plan": payload.plan.value})
    return CheckoutResponse(checkout_url=url)


@router.post("/portal", response_model=CheckoutResponse)
def billing_portal(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    user.stripe_customer_id = stripe_service.ensure_customer(
        email=user.email, name=user.name, existing_id=user.stripe_customer_id
    )
    db.commit()
    frontend = settings.FRONTEND_URL.rstrip("/")
    url = stripe_service.create_billing_portal(
        customer_id=user.stripe_customer_id, return_url=f"{frontend}/billing"
    )
    return CheckoutResponse(checkout_url=url)
