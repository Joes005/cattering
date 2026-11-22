import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Payment,
    PaymentStatus,
    Quotation,
    QuotationStatus,
    User,
)
from app.schemas.schemas import InvoiceCreate, InvoiceDetailOut, InvoiceOut

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/invoices", tags=["invoices"])


def _generate_invoice_number() -> str:
    return f"INV-{datetime.now(timezone.utc):%Y%m}-{uuid.uuid4().hex[:6].upper()}"


def _amount_paid(db: Session, invoice: Invoice) -> float:
    paid = db.query(Payment).filter(Payment.invoice_id == invoice.id, Payment.status == PaymentStatus.paid).all()
    return sum(p.amount for p in paid)


def _to_out(db: Session, invoice: Invoice) -> InvoiceOut:
    amount_paid = _amount_paid(db, invoice)
    out = InvoiceOut.model_validate(invoice)
    out.amount_paid = amount_paid
    out.balance_due = max(invoice.total - amount_paid, 0)
    return out


def _to_detail_out(db: Session, invoice: Invoice) -> InvoiceDetailOut:
    amount_paid = _amount_paid(db, invoice)
    out = InvoiceDetailOut.model_validate(invoice)
    out.amount_paid = amount_paid
    out.balance_due = max(invoice.total - amount_paid, 0)
    return out


@router.post(
    "", response_model=InvoiceDetailOut, status_code=status.HTTP_201_CREATED,
)
def create_invoice(
    company_id: str,
    event_id: str,
    payload: InvoiceCreate,
    user: User = Depends(require_permission("invoices.create")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)
    inv_number = payload.invoice_number or _generate_invoice_number()
    invoice = Invoice(
        event_id=event.id,
        company_id=company_id,
        invoice_number=inv_number,
        subtotal=payload.subtotal if payload.subtotal else payload.total,
        tax=payload.tax or 0.0,
        discount=payload.discount or 0.0,
        total=payload.total,
        due_date=payload.due_date,
    )
    db.add(invoice)
    db.flush()

    for item in payload.items:
        db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                description=item.description,
                quantity=item.quantity,
                rate=item.rate,
                amount=item.rate * item.quantity,
            )
        )
    db.commit()
    db.refresh(invoice)
    return _to_detail_out(db, invoice)


@router.post(
    "/from-quotation/{quotation_id}", response_model=InvoiceDetailOut,
)
def create_invoice_from_quotation(
    company_id: str,
    event_id: str,
    quotation_id: str,
    payload: InvoiceCreate,
    user: User = Depends(require_permission("invoices.create")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)
    quotation = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id,
            Quotation.event_id == event.id,
            Quotation.company_id == company_id,
            Quotation.status == QuotationStatus.accepted,
        )
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No accepted quotation found to invoice")

    invoice = Invoice(
        event_id=event.id,
        company_id=company_id,
        invoice_number=_generate_invoice_number(),
        subtotal=quotation.subtotal,
        tax=quotation.subtotal * quotation.tax_percent / 100 if quotation.tax_percent else 0,
        discount=quotation.discount,
        total=quotation.total,
        due_date=payload.due_date or event.event_date,
    )
    db.add(invoice)
    db.flush()

    for item in quotation.items:
        db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                description=item.description,
                quantity=item.quantity,
                rate=item.unit_price,
                amount=item.line_total,
            )
        )
    if quotation.service_charge:
        db.add(InvoiceItem(invoice_id=invoice.id, description="Service charge", quantity=1, rate=quotation.service_charge, amount=quotation.service_charge))
    if quotation.delivery_charge:
        db.add(InvoiceItem(invoice_id=invoice.id, description="Delivery charge", quantity=1, rate=quotation.delivery_charge, amount=quotation.delivery_charge))

    db.commit()
    db.refresh(invoice)
    return _to_detail_out(db, invoice)


@router.get("", response_model=list[InvoiceOut])
def list_invoices(
    company_id: str, event_id: str, user: User = Depends(require_permission("invoices.view")), db: Session = Depends(get_db)
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    invoices = db.query(Invoice).filter(Invoice.event_id == event_id, Invoice.company_id == company_id).all()
    return [_to_out(db, inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceDetailOut)
def get_invoice(
    company_id: str,
    event_id: str,
    invoice_id: str,
    user: User = Depends(require_permission("invoices.view")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.event_id == event_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _to_detail_out(db, invoice)


@router.post("/{invoice_id}/send", response_model=InvoiceOut)
def send_invoice(
    company_id: str,
    event_id: str,
    invoice_id: str,
    user: User = Depends(require_permission("invoices.update")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.event_id == event_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if invoice.status == InvoiceStatus.draft:
        invoice.status = InvoiceStatus.sent
    db.commit()
    db.refresh(invoice)
    return _to_out(db, invoice)
