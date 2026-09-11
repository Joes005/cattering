from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import Attendance, User
from app.schemas.schemas import AttendanceOut

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/attendance", tags=["attendance"])


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    company_id: str,
    event_id: str,
    user: User = Depends(require_permission("attendance.view")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    return db.query(Attendance).filter(Attendance.event_id == event_id).all()
