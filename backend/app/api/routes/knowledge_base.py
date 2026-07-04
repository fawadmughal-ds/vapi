"""Knowledge base document upload & management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_verified_user, tenant_id
from app.models.agent import Agent
from app.models.enums import DocumentStatus
from app.models.knowledge_base import KnowledgeBaseDocument
from app.models.user import User
from app.schemas.common import Message
from app.schemas.knowledge_base import DocumentPublic
from app.services.audit import record_audit
from app.services.documents import detect_type, extract_text
from app.services.storage import storage_service
from app.services.voice import voice_provider

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.get("", response_model=list[DocumentPublic])
def list_documents(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(KnowledgeBaseDocument)
        .where(KnowledgeBaseDocument.user_id == tenant_id(user))
        .order_by(KnowledgeBaseDocument.created_at.desc())
    ).all()
    return rows


@router.post("", response_model=DocumentPublic, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    agent_id: str | None = Form(default=None),
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    file_type = detect_type(file.filename or "", file.content_type)
    if not file_type:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 25 MB limit")

    if agent_id:
        agent = db.get(Agent, agent_id)
        if not agent or agent.user_id != tenant_id(user):
            raise HTTPException(status_code=404, detail="Agent not found")

    rel_path, size = storage_service.save(
        user_id=tenant_id(user), file_name=file.filename or "document", content=content
    )

    doc = KnowledgeBaseDocument(
        user_id=tenant_id(user),
        agent_id=agent_id,
        file_name=file.filename or "document",
        file_path=rel_path,
        file_type=file_type,
        file_size=size,
        status=DocumentStatus.PROCESSING,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Extract text and push to the voice provider as a knowledge source.
    text = extract_text(content, file_type)
    doc.extracted_chars = len(text)
    try:
        doc.vapi_file_id = await voice_provider.upload_file(
            doc.file_name, content, file.content_type or "application/octet-stream"
        )
        doc.status = DocumentStatus.READY
    except Exception as exc:  # noqa: BLE001
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(exc)
    db.commit()
    db.refresh(doc)

    record_audit(db, user_id=user.id, action="document.upload", resource_type="document",
                 resource_id=doc.id)
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: str, user: User = Depends(get_verified_user),
                    db: Session = Depends(get_db)):
    doc = db.get(KnowledgeBaseDocument, doc_id)
    if not doc or doc.user_id != tenant_id(user):
        raise HTTPException(status_code=404, detail="Document not found")
    storage_service.delete(doc.file_path)
    db.delete(doc)
    db.commit()
    record_audit(db, user_id=user.id, action="document.delete", resource_type="document",
                 resource_id=doc_id)
