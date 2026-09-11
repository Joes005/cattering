from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.models import (
    Attendance,
    AttendanceStatus,
    CompanyMember,
    Event,
    EventStaff,
    EventTask,
    GlobalRole,
    MemberStatus,
    User,
)
from app.schemas.schemas import AttendanceOut, EventTaskOut, EventTaskUpdate, MyAssignmentOut

router = APIRouter(prefix="/api/me", tags=["my work"])


def _my_member_ids(db: Session, user: User) -> list[str]:
    if user.global_role != GlobalRole.company_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee access required")
    rows = (
        db.query(CompanyMember.id)
        .filter(CompanyMember.user_id == user.id, CompanyMember.status == MemberStatus.active)
        .all()
    )
    return [r.id for r in rows]


@router.get("/assignments", response_model=list[MyAssignmentOut])
def my_assignments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_ids = _my_member_ids(db, user)
    rows = (
        db.query(EventStaff, Event)
        .join(Event, Event.id == EventStaff.event_id)
        .filter(EventStaff.company_member_id.in_(member_ids), Event.deleted_at.is_(None))
        .order_by(Event.event_date)
        .all()
    )
    return [
        MyAssignmentOut(
            id=a.id,
            event_id=e.id,
            event_title=e.title,
            event_date=e.event_date,
            venue_name=e.venue_name,
            guest_count=e.guest_count,
            event_role=a.event_role,
            shift_start=a.shift_start,
            shift_end=a.shift_end,
            status=a.status,
        )
        for a, e in rows
    ]


@router.get("/tasks", response_model=list[EventTaskOut])
def my_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_ids = _my_member_ids(db, user)
    return (
        db.query(EventTask)
        .filter(EventTask.assigned_to.in_(member_ids))
        .order_by(EventTask.due_at.is_(None), EventTask.due_at)
        .all()
    )


@router.patch("/tasks/{task_id}", response_model=EventTaskOut)
def update_my_task(task_id: str, payload: EventTaskUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_ids = _my_member_ids(db, user)
    task = db.query(EventTask).filter(EventTask.id == task_id, EventTask.assigned_to.in_(member_ids)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    data = payload.model_dump(exclude_unset=True, include={"status", "notes"})
    if data.get("status") == "done":
        data["completed_at"] = datetime.now(timezone.utc)
    for field, value in data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


class CheckInOut(BaseModel):
    event_id: str


@router.post("/attendance/check-in", response_model=AttendanceOut)
def check_in(payload: CheckInOut, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_ids = _my_member_ids(db, user)
    assignment = (
        db.query(EventStaff)
        .filter(EventStaff.event_id == payload.event_id, EventStaff.company_member_id.in_(member_ids))
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not assigned to this event")

    record = (
        db.query(Attendance)
        .filter(Attendance.company_member_id == assignment.company_member_id, Attendance.event_id == payload.event_id)
        .first()
    )
    if not record:
        record = Attendance(company_member_id=assignment.company_member_id, event_id=payload.event_id)
        db.add(record)
    record.check_in = datetime.now(timezone.utc)
    record.status = AttendanceStatus.present
    db.commit()
    db.refresh(record)
    return record


@router.post("/attendance/check-out", response_model=AttendanceOut)
def check_out(payload: CheckInOut, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_ids = _my_member_ids(db, user)
    record = (
        db.query(Attendance)
        .filter(Attendance.company_member_id.in_(member_ids), Attendance.event_id == payload.event_id)
        .first()
    )
    if not record or not record.check_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You haven't checked in to this event yet")

    record.check_out = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record
