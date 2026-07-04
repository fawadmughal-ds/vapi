"""Reusable pagination helper for list endpoints."""

from __future__ import annotations

import math
from typing import Sequence, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.schemas.common import Page

T = TypeVar("T")


def paginate(db: Session, stmt, page: int, page_size: int) -> tuple[Sequence, int]:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.limit(page_size).offset((page - 1) * page_size)).all()
    return rows, total


def build_page(items: list, total: int, page: int, page_size: int) -> Page:
    return Page(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if page_size else 0,
    )
