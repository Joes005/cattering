from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import EventTask, TaskStatus, User
from app.schemas.schemas import EventTaskCreate, EventTaskOut, EventTaskUpdate

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/tasks", tags=["tasks"])


@router.post("", response_model=EventTaskOut)
def create_task(
    company_id: str,
    event_id: str,
    payload: EventTaskCreate,
    user: User = Depends(require_permission("tasks.update")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    task = EventTask(event_id=event_id, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[EventTaskOut])
def list_tasks(
    company_id: str,
    event_id: str,
    user: User = Depends(require_permission("tasks.view")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    return (
        db.query(EventTask)
        .filter(EventTask.event_id == event_id)
        .order_by(EventTask.phase, EventTask.due_at.is_(None), EventTask.due_at)
        .all()
    )


@router.patch("/{task_id}", response_model=EventTaskOut)
def update_task(
    company_id: str,
    event_id: str,
    task_id: str,
    payload: EventTaskUpdate,
    user: User = Depends(require_permission("tasks.update")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    task = db.query(EventTask).filter(EventTask.id == task_id, EventTask.event_id == event_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("status") == TaskStatus.done and task.status != TaskStatus.done:
        data["completed_at"] = datetime.now(timezone.utc)
    for field, value in data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task
