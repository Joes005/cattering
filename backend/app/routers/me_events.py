from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.notify import notify_company_managers
from app.core.security import require_client
from app.db.database import get_db
from app.models.models import Client, Company, CompanyStatus, Event, EventStatus, EventStatusHistory, Feedback, User
from app.schemas.schemas import ClientEventCreate, EventDetailOut, EventOut, FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/api/me/events", tags=["client events"])

# A client can only walk away from a booking before it has been committed to
# (advance paid / confirmed) — after that, cancellation is a company-managed
# workflow (refunds etc.), not a one-click client action.
CLIENT_CANCELLABLE_STATUSES = {EventStatus.enquiry, EventStatus.quotation_sent, EventStatus.awaiting_approval}


def _get_or_create_client_record(db: Session, user: User, company_id: str) -> Client:
    client = db.query(Client).filter(Client.company_id == company_id, Client.user_id == user.id).first()
    if client:
        return client
    client = Client(company_id=company_id, user_id=user.id, name=user.full_name, email=user.email, phone=user.phone)
    db.add(client)
    db.flush()
    return client


@router.post("", response_model=EventOut)
def create_my_event(payload: ClientEventCreate, user: User = Depends(require_client), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == payload.company_id, Company.status == CompanyStatus.active).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    client = _get_or_create_client_record(db, user, company.id)

    data = payload.model_dump(exclude={"company_id"})
    if not data.get("title"):
        data["title"] = f"{payload.event_type} for {payload.guest_count} guests"

    event = Event(company_id=company.id, client_id=client.id, created_by=user.id, **data)
    db.add(event)
    db.flush()
    db.add(EventStatusHistory(event_id=event.id, from_status=None, to_status=event.status, changed_by=user.id))
    notify_company_managers(
        db,
        company.id,
        type="booking_received",
        title="New booking request",
        body=f"{user.full_name} requested {event.title} for {event.event_date:%d %b %Y}.",
        related_entity_type="event",
        related_entity_id=event.id,
    )
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_my_events(user: User = Depends(require_client), db: Session = Depends(get_db)):
    return (
        db.query(Event)
        .join(Client, Client.id == Event.client_id)
        .filter(Client.user_id == user.id, Event.deleted_at.is_(None))
        .order_by(Event.event_date.desc())
        .all()
    )


@router.get("/{event_id}", response_model=EventDetailOut)
def get_my_event(event_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = (
        db.query(Event)
        .join(Client, Client.id == Event.client_id)
        .filter(Event.id == event_id, Client.user_id == user.id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return event


@router.post("/{event_id}/cancel", response_model=EventOut)
def cancel_my_event(event_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = (
        db.query(Event)
        .join(Client, Client.id == Event.client_id)
        .filter(Event.id == event_id, Client.user_id == user.id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if event.status not in CLIENT_CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event can no longer be cancelled directly — please contact the caterer.",
        )

    db.add(
        EventStatusHistory(
            event_id=event.id, from_status=event.status, to_status=EventStatus.cancelled, changed_by=user.id
        )
    )
    event.status = EventStatus.cancelled
    db.commit()
    db.refresh(event)
    return event


@router.get("/{event_id}/feedback", response_model=FeedbackOut | None)
def get_my_feedback(event_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = (
        db.query(Event)
        .join(Client, Client.id == Event.client_id)
        .filter(Event.id == event_id, Client.user_id == user.id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return db.query(Feedback).filter(Feedback.event_id == event_id).first()


@router.post("/{event_id}/feedback", response_model=FeedbackOut)
def submit_feedback(event_id: str, payload: FeedbackCreate, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = (
        db.query(Event)
        .join(Client, Client.id == Event.client_id)
        .filter(Event.id == event_id, Client.user_id == user.id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if event.status != EventStatus.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feedback can only be left once the event is completed")
    if db.query(Feedback).filter(Feedback.event_id == event_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feedback has already been submitted for this event")

    feedback = Feedback(event_id=event_id, **payload.model_dump())
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
