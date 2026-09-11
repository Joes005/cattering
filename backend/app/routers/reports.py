from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_permission
from app.db.database import get_db
from app.models.models import Event, EventStatus, Invoice, Payment, PaymentStatus, PaymentType, Quotation, QuotationStatus, User
from app.schemas.schemas import EventsReportOut, RevenueReportOut, SalesReportOut

router = APIRouter(prefix="/api/companies/{company_id}/reports", tags=["reports"])

CONFIRMED_OR_LATER = {
    EventStatus.confirmed, EventStatus.preparation, EventStatus.in_progress, EventStatus.completed,
}


@router.get("/sales", response_model=SalesReportOut)
def sales_report(
    company_id: str, user: User = Depends(require_permission("reports.view")), db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.company_id == company_id, Event.deleted_at.is_(None)).all()
    quotations = db.query(Quotation).filter(Quotation.company_id == company_id).all()

    sent = [q for q in quotations if q.status != QuotationStatus.draft]
    accepted = [q for q in quotations if q.status == QuotationStatus.accepted]
    confirmed = [e for e in events if e.status in CONFIRMED_OR_LATER]

    return SalesReportOut(
        total_enquiries=len(events),
        total_quotations_sent=len(sent),
        quotations_accepted=len(accepted),
        conversion_rate=round(len(accepted) / len(sent) * 100, 1) if sent else 0,
        confirmed_bookings=len(confirmed),
    )


@router.get("/revenue", response_model=RevenueReportOut)
def revenue_report(
    company_id: str, user: User = Depends(require_permission("reports.financial")), db: Session = Depends(get_db)
):
    invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
    payments = db.query(Payment).filter(Payment.company_id == company_id, Payment.status == PaymentStatus.paid).all()

    total_revenue = sum(inv.total for inv in invoices)
    collected = sum(-p.amount if p.type == PaymentType.refund else p.amount for p in payments)
    outstanding = max(total_revenue - collected, 0)

    monthly_counter: Counter = Counter()
    for p in payments:
        if p.paid_at:
            key = f"{p.paid_at:%Y-%m}"
            monthly_counter[key] += -p.amount if p.type == PaymentType.refund else p.amount
    monthly = [{"month": k, "amount": v} for k, v in sorted(monthly_counter.items())]

    return RevenueReportOut(total_revenue=total_revenue, collected=collected, outstanding=outstanding, monthly=monthly)


@router.get("/events", response_model=EventsReportOut)
def events_report(
    company_id: str, user: User = Depends(require_permission("reports.view")), db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.company_id == company_id, Event.deleted_at.is_(None)).all()

    by_status = Counter(e.status.value for e in events)
    by_type = Counter(e.event_type for e in events)
    by_month = Counter(f"{e.event_date:%Y-%m}" for e in events)

    return EventsReportOut(by_status=dict(by_status), by_type=dict(by_type), by_month=dict(sorted(by_month.items())))
