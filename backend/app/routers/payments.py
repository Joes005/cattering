from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.notify import notify
from app.core.payments_logic import apply_payment_effects
from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import Invoice, Payment, PaymentStatus, User
from app.schemas.schemas import PaymentCreate, PaymentOut

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/payments", tags=["payments"])


@router.post("", response_model=PaymentOut)
def record_payment(
    company_id: str,
    event_id: str,
    payload: PaymentCreate,
    user: User = Depends(require_permission("payments.create")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)
    invoice = (
        db.query(Invoice)
        .filter(Invoice.event_id == event.id)
        .order_by(Invoice.created_at.desc())
        .first()
    )

    payment = Payment(
        invoice_id=invoice.id if invoice else None,
        event_id=event.id,
        company_id=company_id,
        amount=payload.amount,
        type=payload.type,
        status=PaymentStatus.paid,
        provider=payload.method or "manual",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    db.flush()

    apply_payment_effects(db, event)

    if event.client.user_id:
        notify(
            db,
            event.client.user_id,
            type="payment_recorded",
            title="Payment recorded",
            body=f"₹{payment.amount:,.0f} has been recorded for {event.title}.",
            company_id=company_id,
            related_entity_type="event",
            related_entity_id=event.id,
        )

    db.commit()
    db.refresh(payment)
    return payment


@router.get("", response_model=list[PaymentOut])
def list_payments(
    company_id: str, event_id: str, user: User = Depends(require_permission("payments.view")), db: Session = Depends(get_db)
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    return (
        db.query(Payment)
        .filter(Payment.event_id == event_id, Payment.company_id == company_id)
        .order_by(Payment.created_at.desc())
        .all()
    )
