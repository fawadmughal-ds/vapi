"""Shared schema utilities."""

from datetime import datetime
from typing import Generic, List, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedSchema(ORMBase):
    id: str
    created_at: datetime
    updated_at: datetime


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class Message(BaseModel):
    detail: str
