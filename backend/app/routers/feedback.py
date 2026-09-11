from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import Feedback, User
from app.schemas.schemas import FeedbackOut

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/feedback", tags=["feedback"])


@router.get("", response_model=FeedbackOut | None)
def get_feedback(
    company_id: str, event_id: str, user: User = Depends(require_permission("events.view")), db: Session = Depends(get_db)
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    return db.query(Feedback).filter(Feedback.event_id == event_id).first()
