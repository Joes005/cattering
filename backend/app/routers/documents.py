from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import ensure_company_scope, get_current_user, require_employer
from app.core.storage import storage
from app.db.database import get_db
from app.models.models import (
    Company,
    Document,
    DocumentType,
    DocumentVisibility,
    EmployeeAssignment,
    EmployeeProfile,
    Event,
    User,
    UserRole,
)
from app.schemas.schemas import DocumentOut

company_router = APIRouter(prefix="/api/companies/{company_id}", tags=["documents"])
global_router = APIRouter(prefix="/api/documents", tags=["documents"])


@company_router.post("/documents", response_model=DocumentOut)
def upload_document(
    company_id: str,
    file: UploadFile = File(...),
    type: DocumentType = Form(...),
    visibility: DocumentVisibility = Form(DocumentVisibility.internal),
    event_id: str | None = Form(None),
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    if event_id:
        event = db.query(Event).filter(Event.id == event_id, Event.company_id == company_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in your company")

    try:
        file_url = storage.save(file, subdir=company_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    document = Document(
        company_id=company_id,
        event_id=event_id,
        type=type,
        file_url=file_url,
        uploaded_by=user.id,
        visibility=visibility,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@company_router.get("/documents", response_model=list[DocumentOut])
def list_documents(
    company_id: str,
    event_id: str | None = None,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    query = db.query(Document).filter(Document.company_id == company_id)
    if event_id:
        query = query.filter(Document.event_id == event_id)
    return query.order_by(Document.created_at.desc()).all()


# ── Secure Authenticated File Download Endpoint ───────────────────────────
@global_router.get("/{document_id}/download")
def download_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Authorization Check:
    # 1. Admin has access
    # 2. Employer who owns the company has access
    # 3. Assigned employee has access if visibility is 'workforce' or 'public'
    authorized = False
    if user.role == UserRole.admin:
        authorized = True
    elif user.role == UserRole.employer:
        company = db.query(Company).filter(Company.owner_id == user.id).first()
        if company and company.id == document.company_id:
            authorized = True
    elif user.role == UserRole.employee:
        profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first()
        if profile and document.visibility in [DocumentVisibility.workforce, DocumentVisibility.public]:
            if document.event_id:
                asg = (
                    db.query(EmployeeAssignment)
                    .filter(EmployeeAssignment.event_id == document.event_id, EmployeeAssignment.employee_id == profile.id)
                    .first()
                )
                if asg:
                    authorized = True
            else:
                authorized = True

    if not authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this document")

    # Locate physical file
    # file_url is formatted as "/files/{subdir}/{filename}"
    rel_path = document.file_url.removeprefix("/files/")
    file_path = Path(settings.UPLOAD_DIR) / rel_path
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical file missing on server")

    return FileResponse(path=str(file_path), filename=file_path.name)
