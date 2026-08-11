"""Stripe billing integration."""

from __future__ import annotations

import logging
from typing import Optional

import stripe

from app.core.config import settings
from app.models.enums import PlanTier
from app.services.plans import stripe_price_for

logger = logging.getLogger("voxa.stripe")


class WebhookVerificationError(Exception):
    """Stripe webhook signature missing or invalid."""


class WebhookNotConfiguredError(WebhookVerificationError):
    """Stripe webhook secret required but not configured (production)."""

if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    @property
    def enabled(self) -> bool:
        return bool(settings.STRIPE_SECRET_KEY)

    def ensure_customer(self, *, email: str, name: str, existing_id: Optional[str]) -> str:
        if not self.enabled:
            return existing_id or f"cus_mock_{email}"
        if existing_id and not existing_id.startswith("cus_mock_"):
            return existing_id
        customer = stripe.Customer.create(email=email, name=name)
        return customer.id

    def create_checkout_session(
        self,
        *,
        customer_id: str,
        plan: PlanTier,
        success_url: str,
        cancel_url: str,
        client_reference_id: str,
    ) -> str:
        price_id = stripe_price_for(plan)
        if not self.enabled or not price_id:
            # Local/dev fallback: return a fake URL the frontend can detect.
            return f"{success_url}?mock=1&plan={plan.value}"
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=client_reference_id,
            allow_promotion_codes=True,
        )
        return session.url

    def create_billing_portal(self, *, customer_id: str, return_url: str) -> str:
        if not self.enabled:
            return return_url
        session = stripe.billing_portal.Session.create(
            customer=customer_id, return_url=return_url
        )
        return session.url

    def verify_webhook(self, payload: bytes, signature: str):
        """Verify a Stripe webhook signature.

        Fail-closed in ALL environments: an unsigned/unconfigured webhook is
        never trusted, because accepting one lets anyone forge
        ``checkout.session.completed`` and provision a paid plan for free.
        """
        secret = settings.STRIPE_WEBHOOK_SECRET
        if not secret:
            logger.error("STRIPE_WEBHOOK_SECRET is not configured — rejecting webhook")
            raise WebhookNotConfiguredError("Stripe webhook secret not configured")
        if not signature:
            raise WebhookVerificationError("Missing Stripe-Signature header")
        return stripe.Webhook.construct_event(payload, signature, secret)


stripe_service = StripeService()
