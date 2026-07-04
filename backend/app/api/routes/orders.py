"""Order management routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.pagination import build_page, paginate
from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.enums import OrderStatus
from app.models.order import Order
from app.models.user import User
from app.schemas.common import Page
from app.schemas.order import OrderCreate, OrderPublic, OrderUpdate
from app.services.audit import record_audit

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=Page[OrderPublic])
def list_orders(
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: OrderStatus | None = Query(None, alias="status"),
):
    stmt = select(Order).where(Order.user_id == tenant_id(user))
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    stmt = stmt.order_by(Order.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    return build_page([OrderPublic.model_validate(o) for o in rows], total, page, page_size)


@router.post("", response_model=OrderPublic, status_code=201)
def create_order(payload: OrderCreate, user: User = Depends(get_verified_user),
                 db: Session = Depends(get_db)):
    order = Order(user_id=tenant_id(user), **payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return OrderPublic.model_validate(order)


@router.patch("/{order_id}", response_model=OrderPublic)
def update_order(order_id: str, payload: OrderUpdate,
                 user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order or order.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Order not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    record_audit(db, user_id=user.id, action="order.update", resource_type="order",
                 resource_id=order.id)
    return OrderPublic.model_validate(order)


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: str, user: User = Depends(get_verified_user),
                 db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order or order.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
