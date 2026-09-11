from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_client
from app.db.database import get_db
from app.models.models import Client, Event, Invoice, Payment, PaymentStatus, PaymentType, User
from app.schemas.schemas import InvoiceDetailOut, InvoiceOut

router = APIRouter(prefix="/api/me/events/{event_id}/invoices", tags=["client invoices"])


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


def _with_totals(db: Session, invoice: Invoice) -> InvoiceOut:
    paid = sum(
        (-p.amount if p.type == PaymentType.refund else p.amount)
        for p in db.query(Payment).filter(Payment.invoice_id == invoice.id, Payment.status == PaymentStatus.paid)
    )
    out = InvoiceOut.model_validate(invoice)
    out.amount_paid = paid
    out.balance_due = max(invoice.total - paid, 0)
    return out


@router.get("", response_model=list[InvoiceOut])
def list_my_invoices(event_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    invoices = db.query(Invoice).filter(Invoice.event_id == event.id).all()
    return [_with_totals(db, inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceDetailOut)
def get_my_invoice(event_id: str, invoice_id: str, user: User = Depends(require_client), db: Session = Depends(get_db)):
    event = _get_my_event_or_404(db, user, event_id)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.event_id == event.id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _with_totals(db, invoice)
