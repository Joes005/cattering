from datetime import datetime, timezone

from sqlalchemy import or_

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.models import Message, User
from app.schemas.schemas import ConversationOut, MessageCreate, MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/conversations", response_model=list[ConversationOut])
def conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    messages = (
        db.query(Message)
        .filter(or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id))
        .order_by(Message.created_at.desc())
        .all()
    )

    by_counterpart: dict[str, dict] = {}
    for m in messages:
        other_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        entry = by_counterpart.setdefault(
            other_id,
            {"last_message": m.body, "last_message_at": m.created_at, "unread_count": 0},
        )
        if m.receiver_id == current_user.id and m.read_at is None:
            entry["unread_count"] += 1

    results = []
    for other_id, entry in by_counterpart.items():
        other_user = db.query(User).filter(User.id == other_id).first()
        if not other_user:
            continue
        results.append(
            ConversationOut(
                other_user_id=other_id,
                other_user_name=other_user.name,
                last_message=entry["last_message"],
                last_message_at=entry["last_message_at"],
                unread_count=entry["unread_count"],
            )
        )
    results.sort(key=lambda c: c.last_message_at, reverse=True)
    return results


@router.post("", response_model=MessageOut)
def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = Message(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        booking_id=payload.booking_id,
        body=payload.body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/inbox", response_model=list[MessageOut])
def inbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Message)
        .filter(or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id))
        .order_by(Message.created_at.desc())
        .all()
    )


@router.get("/thread/{other_user_id}", response_model=list[MessageOut])
def thread_with_user(
    other_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = (
        db.query(Message)
        .filter(
            or_(
                (Message.sender_id == current_user.id) & (Message.receiver_id == other_user_id),
                (Message.sender_id == other_user_id) & (Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    unread_ids = [m.id for m in thread if m.receiver_id == current_user.id and m.read_at is None]
    if unread_ids:
        db.query(Message).filter(Message.id.in_(unread_ids)).update(
            {"read_at": datetime.now(timezone.utc)}, synchronize_session=False
        )
        db.commit()

    return thread
