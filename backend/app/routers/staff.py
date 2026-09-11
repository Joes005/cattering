from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import AssignmentStatus, CompanyMember, Event, EventStaff, User
from app.schemas.schemas import EventStaffCreate, EventStaffOut, EventStaffUpdate

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/staff", tags=["staff"])

DEFAULT_SHIFT_HOURS = 4


def _to_out(assignment: EventStaff) -> EventStaffOut:
    return EventStaffOut(
        id=assignment.id,
        event_id=assignment.event_id,
        company_member_id=assignment.company_member_id,
        member_name=assignment.company_member.user.full_name,
        event_role=assignment.event_role,
        shift_start=assignment.shift_start,
        shift_end=assignment.shift_end,
        status=assignment.status,
        notes=assignment.notes,
    )


def _resolve_shift(event: Event, shift_start, shift_end):
    start = shift_start or event.start_time or event.event_date
    end = shift_end or event.end_time or (start + timedelta(hours=DEFAULT_SHIFT_HOURS))
    return start, end


def _find_conflict(db: Session, company_id: str, company_member_id: str, event_id: str, start, end):
    candidates = (
        db.query(EventStaff)
        .join(Event, Event.id == EventStaff.event_id)
        .filter(
            EventStaff.company_member_id == company_member_id,
            EventStaff.status != AssignmentStatus.declined,
            EventStaff.event_id != event_id,
            Event.company_id == company_id,
        )
        .all()
    )
    for other in candidates:
        other_start, other_end = _resolve_shift(other.event, other.shift_start, other.shift_end)
        if start < other_end and end > other_start:
            return other
    return None


@router.post("", response_model=EventStaffOut)
def assign_staff(
    company_id: str,
    event_id: str,
    payload: EventStaffCreate,
    user: User = Depends(require_permission("events.assign")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)
    member = (
        db.query(CompanyMember)
        .filter(CompanyMember.id == payload.company_member_id, CompanyMember.company_id == company_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    start, end = _resolve_shift(event, payload.shift_start, payload.shift_end)
    conflict = _find_conflict(db, company_id, member.id, event_id, start, end)
    if conflict:
        c_start, c_end = _resolve_shift(conflict.event, conflict.shift_start, conflict.shift_end)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Conflict detected: {member.user.full_name} is already assigned to "
                f"'{conflict.event.title}' from {c_start:%I:%M %p} to {c_end:%I:%M %p} "
                f"on {c_start:%d %b %Y}."
            ),
        )

    assignment = EventStaff(
        event_id=event_id,
        company_member_id=member.id,
        event_role=payload.event_role,
        shift_start=payload.shift_start,
        shift_end=payload.shift_end,
        notes=payload.notes,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return _to_out(assignment)


@router.get("", response_model=list[EventStaffOut])
def list_event_staff(
    company_id: str,
    event_id: str,
    user: User = Depends(require_permission("events.view")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    assignments = db.query(EventStaff).filter(EventStaff.event_id == event_id).all()
    return [_to_out(a) for a in assignments]


@router.patch("/{assignment_id}", response_model=EventStaffOut)
def update_assignment(
    company_id: str,
    event_id: str,
    assignment_id: str,
    payload: EventStaffUpdate,
    user: User = Depends(require_permission("events.assign")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    assignment = (
        db.query(EventStaff).filter(EventStaff.id == assignment_id, EventStaff.event_id == event_id).first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)
    return _to_out(assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_assignment(
    company_id: str,
    event_id: str,
    assignment_id: str,
    user: User = Depends(require_permission("events.assign")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    assignment = (
        db.query(EventStaff).filter(EventStaff.id == assignment_id, EventStaff.event_id == event_id).first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(assignment)
    db.commit()
