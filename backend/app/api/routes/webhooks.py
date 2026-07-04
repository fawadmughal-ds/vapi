"""Inbound webhooks from the voice provider (Vapi) and Stripe.

These endpoints are NOT authenticated via JWT; instead they verify provider
signatures/secrets. They are the bridge that keeps our database in sync with
call lifecycle events and billing events.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.agent import Agent
from app.models.call import Call
from app.models.enums import CallDirection, CallStatus, PlanTier
from app.models.user import User
from app.services.billing import activate_plan, record_usage
from app.services.functions import execute_function
from app.services.plans import plan_for_stripe_price
from app.services.stripe_service import (
    WebhookNotConfiguredError,
    WebhookVerificationError,
    stripe_service,
)

logger = logging.getLogger("voxa.webhooks")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_vapi_webhook_secret(x_vapi_secret: str | None) -> None:
    """Env-aware Vapi webhook auth: strict in production, permissive in dev."""
    secret = settings.VAPI_WEBHOOK_SECRET
    if settings.is_production:
        if not secret:
            logger.error("VAPI_WEBHOOK_SECRET is not configured in production")
            raise HTTPException(
                status_code=503, detail="Webhook verification not configured"
            )
        if not x_vapi_secret or x_vapi_secret != secret:
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
        return
    if not secret:
        logger.warning(
            "VAPI_WEBHOOK_SECRET is not set — accepting unsigned Vapi webhooks (dev only)"
        )
        return
    if not x_vapi_secret or x_vapi_secret != secret:
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


_STATUS_MAP = {
    "queued": CallStatus.QUEUED,
    "ringing": CallStatus.RINGING,
    "in-progress": CallStatus.IN_PROGRESS,
    "forwarding": CallStatus.IN_PROGRESS,
    "ended": CallStatus.COMPLETED,
}


def _find_call(db: Session, vapi_call_id: str | None) -> Call | None:
    if not vapi_call_id:
        return None
    return db.query(Call).filter(Call.vapi_call_id == vapi_call_id).first()


def _resolve_agent(db: Session, assistant_id: str | None) -> Agent | None:
    if not assistant_id:
        return None
    return db.query(Agent).filter(Agent.vapi_assistant_id == assistant_id).first()


def _ensure_call(db: Session, message: dict) -> Call | None:
    """Find or create a Call row from a Vapi webhook message."""
    call_obj = message.get("call") or {}
    vapi_call_id = call_obj.get("id") or message.get("callId")
    call = _find_call(db, vapi_call_id)
    if call:
        return call

    assistant_id = (call_obj.get("assistantId")
                    or (message.get("assistant") or {}).get("id"))
    agent = _resolve_agent(db, assistant_id)
    if not agent:
        logger.warning("Webhook for unknown assistant %s", assistant_id)
        return None

    customer = call_obj.get("customer") or {}
    call = Call(
        user_id=agent.user_id,
        agent_id=agent.id,
        vapi_call_id=vapi_call_id,
        direction=CallDirection.INBOUND
        if call_obj.get("type") == "inboundPhoneCall"
        else CallDirection.OUTBOUND,
        status=CallStatus.IN_PROGRESS,
        caller_number=customer.get("number"),
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


@router.post("/vapi")
async def vapi_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_vapi_secret: str | None = Header(default=None),
):
    _verify_vapi_webhook_secret(x_vapi_secret)

    body = await request.json()
    message = body.get("message", body)
    event_type = message.get("type")
    logger.info("Vapi webhook: %s", event_type)

    # ── Function / tool calls ──────────────────────────────────────────────
    if event_type in ("function-call", "tool-calls"):
        return _handle_tool_calls(db, message)

    # ── Call lifecycle ─────────────────────────────────────────────────────
    if event_type == "status-update":
        call = _ensure_call(db, message)
        if call:
            status = _STATUS_MAP.get(message.get("status", ""), call.status)
            call.status = status
            if status == CallStatus.IN_PROGRESS and not call.started_at:
                call.started_at = datetime.now(timezone.utc)
            db.commit()
        return {"received": True}

    if event_type == "transcript":
        call = _ensure_call(db, message)
        if call:
            transcript = message.get("transcript") or ""
            call.transcript = (call.transcript or "") + transcript + "\n"
            db.commit()
        return {"received": True}

    if event_type == "end-of-call-report":
        return _handle_end_of_call(db, message)

    return {"received": True, "ignored": event_type}


def _handle_tool_calls(db: Session, message: dict) -> dict:
    call = _ensure_call(db, message)
    if not call:
        return {"results": []}

    # Support both legacy "functionCall" and newer "toolCalls" shapes.
    tool_calls = message.get("toolCalls") or message.get("toolCallList") or []
    if not tool_calls and message.get("functionCall"):
        fc = message["functionCall"]
        tool_calls = [{"id": fc.get("name"), "function": fc}]

    results = []
    for tc in tool_calls:
        fn = tc.get("function", tc)
        name = fn.get("name")
        args = fn.get("arguments") or fn.get("parameters") or {}
        if isinstance(args, str):
            import json

            try:
                args = json.loads(args)
            except json.JSONDecodeError:
                args = {}
        result = execute_function(
            db,
            name=name,
            arguments=args,
            user_id=call.user_id,
            agent_id=call.agent_id,
            call_id=call.id,
        )
        results.append({"toolCallId": tc.get("id"), "result": result.get("message", "")})

    return {"results": results}


def _handle_end_of_call(db: Session, message: dict) -> dict:
    call = _ensure_call(db, message)
    if not call:
        return {"received": True}

    call_obj = message.get("call") or {}
    call.status = CallStatus.COMPLETED
    call.ended_reason = message.get("endedReason")
    call.recording_url = (
        message.get("recordingUrl")
        or message.get("stereoRecordingUrl")
        or call.recording_url
    )
    call.summary = message.get("summary") or call.summary
    transcript = message.get("transcript")
    if transcript:
        call.transcript = transcript

    cost = message.get("cost")
    if cost is not None:
        call.cost = float(cost)

    duration = message.get("durationSeconds")
    if duration is None and message.get("startedAt") and message.get("endedAt"):
        try:
            start = datetime.fromisoformat(message["startedAt"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(message["endedAt"].replace("Z", "+00:00"))
            duration = (end - start).total_seconds()
        except (ValueError, KeyError):
            duration = 0
    call.duration_seconds = int(duration or 0)
    call.ended_at = datetime.now(timezone.utc)

    db.commit()

    # Deduct usage from the tenant's quota.
    record_usage(db, call.user_id, call.duration_seconds / 60)
    return {"received": True}


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
):
    payload = await request.body()
    try:
        event = stripe_service.verify_webhook(payload, stripe_signature or "")
    except WebhookNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except WebhookVerificationError as exc:
        raise HTTPException(status_code=401, detail="Invalid Stripe signature") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid Stripe signature") from exc

    event_type = event.get("type") if isinstance(event, dict) else event["type"]
    data = (event.get("data", {}) if isinstance(event, dict) else event["data"]).get("object", {})
    logger.info("Stripe webhook: %s", event_type)

    if event_type == "checkout.session.completed":
        user_id = data.get("client_reference_id")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        user = db.get(User, user_id) if user_id else None
        if not user and customer_id:
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            # Determine plan from the line item price if available.
            plan = PlanTier.STARTER
            price_id = None
            line_items = data.get("line_items", {}).get("data", []) if data.get("line_items") else []
            if line_items:
                price_id = line_items[0].get("price", {}).get("id")
            resolved = plan_for_stripe_price(price_id) if price_id else None
            if resolved:
                plan = resolved
            activate_plan(
                db, user.id, plan,
                stripe_subscription_id=subscription_id, stripe_price_id=price_id,
            )

    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        customer_id = data.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            items = data.get("items", {}).get("data", [])
            price_id = items[0].get("price", {}).get("id") if items else None
            plan = plan_for_stripe_price(price_id) if price_id else None
            if plan:
                activate_plan(db, user.id, plan,
                              stripe_subscription_id=data.get("id"), stripe_price_id=price_id)

    return {"received": True}
