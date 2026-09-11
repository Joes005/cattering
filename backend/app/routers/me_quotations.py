from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.event_lifecycle import is_transition_allowed
from app.core.notify import notify_company_managers
from app.core.security import require_client
from app.db.database import get_db
from app.models.models import Client, Event, EventStatus, EventStatusHistory, Quotation, QuotationStatus, User
from app.schemas.schemas import QuotationDetailOut, QuotationOut

router = APIRouter(prefix="/api/me/events/{event_id}/quotations", tags=["client quotations"])


def _get_my_event_or_404(db: Session, user: User, event_id: str) -> Event:
    event = (
        db.query(Event)
        .join(Client, Client.id == Event.client_id)
        .filter(Event.id == event_id, Client.user_id == user.id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return event


@router.get("", response_model=list[QuotationOut])
def list_my_quotations(event_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    return (
        db.query(Quotation)
        .filter(Quotation.event_id == event.id, Quotation.status != QuotationStatus.draft)
        .order_by(Quotation.created_at.desc())
        .all()
    )


@router.get("/{quotation_id}", response_model=QuotationDetailOut)
def get_my_quotation(event_id: str, quotation_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id, Quotation.event_id == event.id, Quotation.status != QuotationStatus.draft)
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return quotation


@router.post("/{quotation_id}/accept", response_model=QuotationOut)
def accept_quotation(event_id: str, quotation_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id, Quotation.event_id == event.id, Quotation.status == QuotationStatus.sent)
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending quotation found to accept")

    quotation.status = QuotationStatus.accepted
    quotation.responded_at = datetime.now(timezone.utc)

    if is_transition_allowed(event.status, EventStatus.advance_pending):
        db.add(
            EventStatusHistory(
                event_id=event.id, from_status=event.status, to_status=EventStatus.advance_pending,
                note=f"Quotation {quotation.quote_number} accepted",
            )
        )
        event.status = EventStatus.advance_pending

    notify_company_managers(
        db,
        event.company_id,
        type="quotation_accepted",
        title="Quotation accepted",
        body=f"{user.full_name} accepted quotation {quotation.quote_number} for {event.title}.",
        related_entity_type="event",
        related_entity_id=event.id,
    )

    db.commit()
    db.refresh(quotation)
    return quotation


@router.post("/{quotation_id}/reject", response_model=QuotationOut)
def reject_quotation(event_id: str, quotation_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id, Quotation.event_id == event.id, Quotation.status == QuotationStatus.sent)
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending quotation found to reject")

    quotation.status = QuotationStatus.rejected
    quotation.responded_at = datetime.now(timezone.utc)

    if is_transition_allowed(event.status, EventStatus.rejected):
        db.add(
            EventStatusHistory(
                event_id=event.id, from_status=event.status, to_status=EventStatus.rejected,
                note=f"Quotation {quotation.quote_number} rejected by client",
            )
        )
        event.status = EventStatus.rejected

    notify_company_managers(
        db,
        event.company_id,
        type="quotation_rejected",
        title="Quotation rejected",
        body=f"{user.full_name} rejected quotation {quotation.quote_number} for {event.title}.",
        related_entity_type="event",
        related_entity_id=event.id,
    )

    db.commit()
    db.refresh(quotation)
    return quotation
