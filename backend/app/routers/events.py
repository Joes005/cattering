from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.models.models import Booking, Event, User
from app.schemas.schemas import EventCreate, EventDetailOut, EventOut

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("", response_model=EventOut)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(require_role("organizer", "admin")),
    db: Session = Depends(get_db),
):
    event = Event(organizer_id=current_user.id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/mine", response_model=list[EventOut])
def my_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Event)
        .filter(Event.organizer_id == current_user.id)
        .order_by(Event.event_date.desc())
        .all()
    )


@router.get("/{event_id}", response_model=EventDetailOut)
def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = (
        db.query(Event)
        .options(joinedload(Event.bookings).joinedload(Booking.package), joinedload(Event.bookings).joinedload(Booking.vendor))
        .filter(Event.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.organizer_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your event")
    return event


@router.put("/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your event")

    for field, value in payload.model_dump().items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your event")

    db.delete(event)
    db.commit()
    return {"ok": True}
