from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.event_lifecycle import is_transition_allowed
from app.core.notify import notify
from app.core.security import get_accessible_event_or_404, get_current_user, require_permission, scope_event_ids_for_staff
from app.db.database import get_db
from app.models.models import Client, Event, EventStatus, EventStatusHistory, User
from app.schemas.schemas import EventCreate, EventDetailOut, EventOut, EventStatusUpdate, EventUpdate

router = APIRouter(prefix="/api/companies/{company_id}/events", tags=["events"])


class CompanyEventCreate(EventCreate):
    client_id: str


@router.post("", response_model=EventOut, dependencies=[Depends(require_permission("events.create"))])
def create_event(
    company_id: str,
    payload: CompanyEventCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == payload.client_id, Client.company_id == company_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found for this company")

    data = payload.model_dump(exclude={"client_id"})
    if not data.get("title"):
        data["title"] = f"{payload.event_type} for {payload.guest_count} guests"

    event = Event(company_id=company_id, client_id=client.id, created_by=user.id, **data)
    db.add(event)
    db.flush()
    db.add(EventStatusHistory(event_id=event.id, from_status=None, to_status=event.status, changed_by=user.id))
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_events(
    company_id: str, user: User = Depends(require_permission("events.view")), db: Session = Depends(get_db)
):
    query = db.query(Event).filter(Event.company_id == company_id, Event.deleted_at.is_(None))

    scoped_ids = scope_event_ids_for_staff(db, user, company_id)
    if scoped_ids is not None:
        # A plain `staff` member only sees events they're assigned to.
        query = query.filter(Event.id.in_(scoped_ids))

    return query.order_by(Event.event_date.desc()).all()


@router.get("/{event_id}", response_model=EventDetailOut)
def get_event(
    company_id: str,
    event_id: str,
    user: User = Depends(require_permission("events.view")),
    db: Session = Depends(get_db),
):
    return get_accessible_event_or_404(db, user, company_id, event_id)


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    company_id: str,
    event_id: str,
    payload: EventUpdate,
    user: User = Depends(require_permission("events.update")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/status", response_model=EventOut)
def transition_event_status(
    company_id: str,
    event_id: str,
    payload: EventStatusUpdate,
    user: User = Depends(require_permission("events.update")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)

    if not is_transition_allowed(event.status, payload.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move this event from '{event.status.value}' to '{payload.status.value}'.",
        )

    db.add(
        EventStatusHistory(
            event_id=event.id, from_status=event.status, to_status=payload.status, changed_by=user.id, note=payload.note
        )
    )
    event.status = payload.status

    if payload.status == EventStatus.completed and event.client.user_id:
        notify(
            db,
            event.client.user_id,
            type="event_completed",
            title="Hope your event went great!",
            body=f"{event.title} is complete — we'd love your feedback.",
            company_id=company_id,
            related_entity_type="event",
            related_entity_id=event.id,
        )

    db.commit()
    db.refresh(event)
    return event
