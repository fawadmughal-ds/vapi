"""User profile & settings routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import UserPublic
from app.schemas.common import Message
from app.services.audit import record_audit

router = APIRouter(prefix="/settings", tags=["settings"])


class ProfileUpdate(BaseModel):
    name: str | None = None
    company_name: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.patch("/profile", response_model=UserPublic)
def update_profile(payload: ProfileUpdate, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if payload.name is not None:
        user.name = payload.name
    if payload.company_name is not None:
        user.company_name = payload.company_name
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.post("/password", response_model=Message)
def change_password(payload: PasswordChange, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    record_audit(db, user_id=user.id, action="user.password_change", resource_type="user",
                 resource_id=user.id)
    return Message(detail="Password updated")
