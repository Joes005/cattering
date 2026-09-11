from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import Message, User
from app.schemas.schemas import MessageCreate, MessageOut

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/messages", tags=["messages"])


def _to_out(message: Message) -> MessageOut:
    return MessageOut(
        id=message.id,
        event_id=message.event_id,
        sender_id=message.sender_id,
        sender_name=message.sender.full_name if getattr(message, "sender", None) else "",
        body=message.body,
        attachment_url=message.attachment_url,
        created_at=message.created_at,
    )


@router.get("", response_model=list[MessageOut])
def list_messages(
    company_id: str, event_id: str, user: User = Depends(require_permission("messages.view")), db: Session = Depends(get_db)
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    messages = (
        db.query(Message)
        .filter(Message.event_id == event_id, Message.company_id == company_id)
        .order_by(Message.created_at)
        .all()
    )
    return [_to_out(m) for m in messages]


@router.post("", response_model=MessageOut)
def send_message(
    company_id: str,
    event_id: str,
    payload: MessageCreate,
    user: User = Depends(require_permission("messages.send")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    message = Message(event_id=event_id, company_id=company_id, sender_id=user.id, **payload.model_dump())
    db.add(message)
    db.commit()
    db.refresh(message)
    return _to_out(message)
