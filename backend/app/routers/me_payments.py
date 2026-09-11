from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.notify import notify_company_managers
from app.core.payments_logic import apply_payment_effects
from app.core.security import require_client
from app.db.database import get_db
from app.models.models import Client, Event, Invoice, Payment, PaymentStatus, User
from app.schemas.schemas import PaymentCreate, PaymentOut

router = APIRouter(prefix="/api/me/events/{event_id}/payments", tags=["client payments"])


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


@router.post("", response_model=PaymentOut)
def make_payment(event_id: str, payload: PaymentCreate, user: User = Depends(require_client), db: Session = Depends(get_db)):
    """Gateway-agnostic stub: records the payment as immediately settled.
    A real gateway integration would create this row from its webhook
    instead of trusting the client directly — swap the status/provider_ref
    assignment below for that when a provider is wired up."""
    event = _get_my_event_or_404(db, user, event_id)
    invoice = db.query(Invoice).filter(Invoice.event_id == event.id).order_by(Invoice.created_at.desc()).first()

    payment = Payment(
        invoice_id=invoice.id if invoice else None,
        event_id=event.id,
        company_id=event.company_id,
        amount=payload.amount,
        type=payload.type,
        status=PaymentStatus.paid,
        provider="stub",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    db.flush()

    apply_payment_effects(db, event)
    notify_company_managers(
        db,
        event.company_id,
        type="payment_received",
        title="Payment received",
        body=f"{user.full_name} paid ₹{payment.amount:,.0f} for {event.title}.",
        related_entity_type="event",
        related_entity_id=event.id,
    )
    db.commit()
    db.refresh(payment)
    return payment


@router.get("", response_model=list[PaymentOut])
def list_my_payments(event_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    return db.query(Payment).filter(Payment.event_id == event.id).order_by(Payment.created_at.desc()).all()
