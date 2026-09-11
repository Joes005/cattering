from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_client
from app.db.database import get_db
from app.models.models import Client, Event, Message, User
from app.schemas.schemas import MessageCreate, MessageOut

router = APIRouter(prefix="/api/me/events/{event_id}/messages", tags=["client messages"])


def _get_my_event_or_404(db: Session, user: User, event_id: str) -> Event:
    event = (
        db.query(Event)
        .join(Client, Client.id == Event.client_id)
        .filter(Event.id == event_id, Client.user_id == user.id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return event


def _to_out(message: Message) -> MessageOut:
    return MessageOut(
        id=message.id,
        event_id=message.event_id,
        sender_id=message.sender_id,
        sender_name=message.sender.full_name if message.sender else "",
        body=message.body,
        attachment_url=message.attachment_url,
        created_at=message.created_at,
    )


@router.get("", response_model=list[MessageOut])
def list_my_messages(event_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    messages = db.query(Message).filter(Message.event_id == event.id).order_by(Message.created_at).all()
    return [_to_out(m) for m in messages]


@router.post("", response_model=MessageOut)
def send_my_message(event_id: str, payload: MessageCreate, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    message = Message(event_id=event.id, company_id=event.company_id, sender_id=user.id, **payload.model_dump())
    db.add(message)
    db.commit()
    db.refresh(message)
    return _to_out(message)
