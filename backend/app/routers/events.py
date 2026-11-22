from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.event_lifecycle import is_transition_allowed
from app.core.notify import notify
from app.core.security import ensure_company_scope, require_employer
from app.db.database import get_db
from app.models.models import Customer, Event, EventStatus, EventStatusHistory, User
from app.schemas.schemas import EventCreate, EventOut, EventStatusUpdate, EventUpdate

router = APIRouter(prefix="/api/companies/{company_id}/events", tags=["events"])


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    company_id: str,
    payload: EventCreate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    customer = (
        db.query(Customer)
        .filter(Customer.id == payload.customer_id, Customer.company_id == company_id, Customer.deleted_at.is_(None))
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found in your company")

    data = payload.model_dump()
    if not data.get("title"):
        data["title"] = f"{payload.event_type} for {payload.guest_count} guests"

    event = Event(
        company_id=company_id,
        created_by=user.id,
        **data,
    )
    db.add(event)
    db.flush()

    db.add(EventStatusHistory(event_id=event.id, from_status=None, to_status=event.status, changed_by=user.id, note="Event created"))
    log_action(db, user.id, "event_created", "event", event.id, company_id=company_id)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_events(
    company_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    return (
        db.query(Event)
        .filter(Event.company_id == company_id, Event.deleted_at.is_(None))
        .order_by(Event.event_date.desc())
        .all()
    )


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    company_id: str,
    event_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.company_id == company_id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    company_id: str,
    event_id: str,
    payload: EventUpdate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.company_id == company_id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if payload.customer_id:
        customer = db.query(Customer).filter(Customer.id == payload.customer_id, Customer.company_id == company_id).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found in your company")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    log_action(db, user.id, "event_updated", "event", event.id, company_id=company_id)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/status", response_model=EventOut)
def transition_event_status(
    company_id: str,
    event_id: str,
    payload: EventStatusUpdate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.company_id == company_id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if not is_transition_allowed(event.status, payload.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move this event from '{event.status.value}' to '{payload.status.value}'.",
        )

    db.add(
        EventStatusHistory(
            event_id=event.id,
            from_status=event.status,
            to_status=payload.status,
            changed_by=user.id,
            note=payload.note,
        )
    )
    event.status = payload.status
    log_action(
        db,
        user.id,
        "event_status_transitioned",
        "event",
        event.id,
        company_id=company_id,
        new_value={"status": payload.status.value, "note": payload.note},
    )
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    company_id: str,
    event_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.company_id == company_id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event.deleted_at = func.now()
    log_action(db, user.id, "event_deleted", "event", event.id, company_id=company_id)
    db.commit()
    return None
