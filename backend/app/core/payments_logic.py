from sqlalchemy.orm import Session

from app.core.event_lifecycle import is_transition_allowed
from app.models.models import (
    Event,
    EventStatus,
    EventStatusHistory,
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentStatus,
    PaymentType,
    Quotation,
    QuotationStatus,
)


def total_paid_for_event(db: Session, event_id: str) -> float:
    payments = db.query(Payment).filter(Payment.event_id == event_id, Payment.status == PaymentStatus.paid).all()
    total = 0.0
    for p in payments:
        total += -p.amount if p.type == PaymentType.refund else p.amount
    return total


def apply_payment_effects(db: Session, event: Event) -> None:
    """Recomputes invoice status and auto-advances the event lifecycle once
    enough has been paid — mirrors the quotation auto-advance pattern."""
    total_paid = total_paid_for_event(db, event.id)

    invoices = db.query(Invoice).filter(Invoice.event_id == event.id).all()
    for invoice in invoices:
        invoice_paid = sum(
            (-p.amount if p.type == PaymentType.refund else p.amount)
            for p in db.query(Payment).filter(Payment.invoice_id == invoice.id, Payment.status == PaymentStatus.paid)
        )
        if invoice_paid >= invoice.total and invoice.total > 0:
            invoice.status = InvoiceStatus.paid
        elif invoice_paid > 0:
            invoice.status = InvoiceStatus.partially_paid

    if event.status == EventStatus.advance_pending:
        quotation = (
            db.query(Quotation)
            .filter(Quotation.event_id == event.id, Quotation.status == QuotationStatus.accepted)
            .order_by(Quotation.responded_at.desc())
            .first()
        )
        advance_required = quotation.advance_amount if quotation else 0
        if total_paid >= advance_required and is_transition_allowed(event.status, EventStatus.confirmed):
            db.add(
                EventStatusHistory(
                    event_id=event.id,
                    from_status=event.status,
                    to_status=EventStatus.confirmed,
                    note=f"Advance payment of ₹{total_paid:,.0f} received",
                )
            )
            event.status = EventStatus.confirmed
