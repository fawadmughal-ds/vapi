"""Function-calling execution engine.

When the voice provider asks the assistant to run a tool (e.g. ``create_order``),
the webhook routes the request here. Each handler performs a real action against
our database and returns a natural-language result the assistant speaks back.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import OrderStatus
from app.models.order import Order
from app.models.audit_log import AuditLog
from app.services.audit import record_audit
from app.services.email import email_service

logger = logging.getLogger("voxa.functions")

# Per-tenant cap on tool-triggered emails (rolling window).
_EMAIL_RATE_LIMIT = 10
_EMAIL_RATE_WINDOW = timedelta(hours=1)


def _create_order(db: Session, user_id: str, agent_id: Optional[str],
                  call_id: Optional[str], args: dict) -> dict:
    order = Order(
        user_id=user_id,
        agent_id=agent_id,
        call_id=call_id,
        customer_name=args.get("customer_name") or args.get("name"),
        phone=args.get("phone"),
        product=args.get("product") or args.get("item"),
        quantity=int(args.get("quantity", 1) or 1),
        status=OrderStatus.PENDING,
        notes=args.get("notes"),
        extra=args,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "success": True,
        "order_id": order.id,
        "message": f"Order #{order.id[:8]} for {order.quantity} x "
        f"{order.product or 'item'} has been created.",
    }


def _book_appointment(db: Session, user_id: str, agent_id: Optional[str],
                      call_id: Optional[str], args: dict) -> dict:
    order = Order(
        user_id=user_id,
        agent_id=agent_id,
        call_id=call_id,
        customer_name=args.get("customer_name") or args.get("name"),
        phone=args.get("phone"),
        product=f"Appointment: {args.get('service', 'consultation')}",
        status=OrderStatus.CONFIRMED,
        notes=f"Scheduled for {args.get('datetime', 'TBD')}",
        extra=args,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "success": True,
        "appointment_id": order.id,
        "message": f"Appointment booked for {args.get('datetime', 'the requested time')}.",
    }


def _create_lead(db: Session, user_id: str, agent_id: Optional[str],
                 call_id: Optional[str], args: dict) -> dict:
    order = Order(
        user_id=user_id,
        agent_id=agent_id,
        call_id=call_id,
        customer_name=args.get("customer_name") or args.get("name"),
        phone=args.get("phone"),
        product="Lead",
        status=OrderStatus.PENDING,
        notes=args.get("notes") or args.get("interest"),
        extra=args,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"success": True, "lead_id": order.id, "message": "Lead captured successfully."}


def _email_rate_limit_exceeded(db: Session, user_id: str) -> bool:
    cutoff = datetime.now(timezone.utc) - _EMAIL_RATE_WINDOW
    count = db.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.user_id == user_id,
            AuditLog.action == "tool.send_email",
            AuditLog.created_at >= cutoff,
        )
    ) or 0
    return count >= _EMAIL_RATE_LIMIT


def _send_email(db: Session, user_id: str, agent_id: Optional[str],
                call_id: Optional[str], args: dict) -> dict:
    if _email_rate_limit_exceeded(db, user_id):
        return {
            "success": False,
            "message": "Email rate limit exceeded for this account. Try again later.",
        }
    to = args.get("to") or args.get("email")
    if not to:
        return {"success": False, "message": "No recipient email provided."}
    email_service.send(
        to=to,
        subject=args.get("subject", "Message from your AI assistant"),
        html=f"<p>{args.get('body', '')}</p>",
        text=args.get("body", ""),
    )
    record_audit(
        db,
        user_id=user_id,
        action="tool.send_email",
        resource_type="email",
        resource_id=call_id,
        detail={"to": to, "agent_id": agent_id},
    )
    return {"success": True, "message": f"Email sent to {to}."}


def _check_status(db: Session, user_id: str, agent_id: Optional[str],
                  call_id: Optional[str], args: dict) -> dict:
    order_id = args.get("order_id") or args.get("id")
    order = db.get(Order, order_id) if order_id else None
    if not order or order.user_id != user_id:
        return {"success": False, "message": "No matching order was found."}
    return {
        "success": True,
        "status": order.status.value,
        "message": f"Order #{order.id[:8]} is currently {order.status.value}.",
    }


HANDLERS = {
    "create_order": _create_order,
    "book_appointment": _book_appointment,
    "create_lead": _create_lead,
    "send_email": _send_email,
    "check_status": _check_status,
}


def execute_function(
    db: Session,
    *,
    name: str,
    arguments: dict[str, Any],
    user_id: str,
    agent_id: Optional[str],
    call_id: Optional[str],
) -> dict:
    handler = HANDLERS.get(name)
    if not handler:
        logger.warning("Unknown function called: %s", name)
        return {"success": False, "message": f"Unknown function '{name}'."}
    try:
        return handler(db, user_id, agent_id, call_id, arguments or {})
    except Exception as exc:  # noqa: BLE001
        logger.exception("Function %s failed", name)
        return {"success": False, "message": f"Failed to execute {name}: {exc}"}
