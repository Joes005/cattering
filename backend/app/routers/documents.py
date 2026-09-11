from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_membership, require_permission
from app.core.storage import storage
from app.db.database import get_db
from app.models.models import Document, DocumentType, DocumentVisibility, Event, GlobalRole, User
from app.schemas.schemas import DocumentOut

router = APIRouter(prefix="/api/companies/{company_id}", tags=["documents"])


@router.post("/documents", response_model=DocumentOut, dependencies=[Depends(require_permission("documents.upload"))])
def upload_document(
    company_id: str,
    file: UploadFile = File(...),
    type: DocumentType = Form(...),
    visibility: DocumentVisibility = Form(DocumentVisibility.internal),
    event_id: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if event_id:
        event = db.query(Event).filter(Event.id == event_id, Event.company_id == company_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

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


@router.get("/documents", response_model=list[DocumentOut], dependencies=[Depends(require_permission("documents.view"))])
def list_documents(company_id: str, event_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Document).filter(Document.company_id == company_id)
    if event_id:
        query = query.filter(Document.event_id == event_id)
    return query.order_by(Document.created_at.desc()).all()


@router.get("/events/{event_id}/documents", response_model=list[DocumentOut])
def list_event_documents_for_client(company_id: str, event_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Client-visible subset (documents.view for staff, or the owning client)."""
    event = db.query(Event).filter(Event.id == event_id, Event.company_id == company_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if user.global_role == GlobalRole.client:
        if not event.client or event.client.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return (
            db.query(Document)
            .filter(Document.event_id == event_id, Document.visibility == DocumentVisibility.client)
            .order_by(Document.created_at.desc())
            .all()
        )

    if not get_membership(db, user, company_id) and user.global_role != GlobalRole.admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return db.query(Document).filter(Document.event_id == event_id).order_by(Document.created_at.desc()).all()
