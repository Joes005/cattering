from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import require_customer
from app.db.database import get_db
from app.models.models import (
    Company,
    CompanyStatus,
    Customer,
    CustomerProfile,
    Event,
    EventStatus,
    Feedback,
    Invoice,
    InvoiceStatus,
    MenuCategory,
    MenuItem,
    Package,
    Payment,
    PaymentStatus,
    PaymentType,
    Quotation,
    QuotationStatus,
    User,
)
from app.schemas.schemas import (
    CompanyOut,
    CustomerEventInquiryCreate,
    CustomerFeedbackCreate,
    CustomerPaymentCreate,
    CustomerProfileOut,
    CustomerProfileUpdate,
    EventOut,
    FeedbackOut,
    InvoiceOut,
    MenuCategoryOut,
    MenuItemOut,
    PackageOut,
    QuotationOut,
)

router = APIRouter(prefix="/api/customer", tags=["customer-portal"])


def _to_company_out(c: Company) -> CompanyOut:
    owner = c.owner
    return CompanyOut(
        id=c.id,
        owner_id=c.owner_id,
        name=c.name,
        slug=c.slug,
        business_type=c.business_type,
        business_address=c.business_address,
        gst_number=c.gst_number,
        description=c.description,
        logo_url=c.logo_url,
        currency=c.currency or "INR",
        status=c.status,
        rejection_reason=c.rejection_reason,
        approved_at=c.approved_at,
        created_at=c.created_at,
        owner_name=owner.full_name if owner else None,
        owner_email=owner.email if owner else None,
        owner_phone=owner.phone if owner else None,
        address=c.business_address,
    )


# ── Profile Endpoints ────────────────────────────────────────────────────────
@router.get("/profile", response_model=CustomerProfileOut)
def get_customer_profile(
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth
    return CustomerProfileOut(
        id=profile.id,
        user_id=user.id,
        city=profile.city,
        default_address=profile.default_address,
        default_delivery_address=profile.default_address,
        preferred_cuisine=profile.preferred_cuisine or [],
        preferred_cuisines=profile.preferred_cuisine or [],
        notes=profile.notes,
        created_at=profile.created_at,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        user=user,
    )


@router.patch("/profile", response_model=CustomerProfileOut)
@router.put("/profile", response_model=CustomerProfileOut)
def update_customer_profile(
    payload: CustomerProfileUpdate,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth
    dump = payload.model_dump(exclude_unset=True)
    if "full_name" in dump and dump["full_name"]:
        user.full_name = dump["full_name"]
    if "phone" in dump:
        user.phone = dump["phone"]
    if "city" in dump and dump["city"]:
        profile.city = dump["city"]
    if "default_delivery_address" in dump:
        profile.default_address = dump["default_delivery_address"]
    elif "default_address" in dump:
        profile.default_address = dump["default_address"]
    if "preferred_cuisines" in dump:
        profile.preferred_cuisine = dump["preferred_cuisines"]
    elif "preferred_cuisine" in dump:
        profile.preferred_cuisine = dump["preferred_cuisine"]
    if "notes" in dump:
        profile.notes = dump["notes"]

    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return get_customer_profile(auth, db)


# ── Caterer Discovery Endpoints ──────────────────────────────────────────────
@router.get("/caterers", response_model=list[CompanyOut])
def browse_catering_companies(
    search: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Public marketplace directory of verified catering businesses."""
    query = db.query(Company).filter(Company.status == CompanyStatus.approved)
    if search:
        query = query.filter((Company.name.ilike(f"%{search}%")) | (Company.description.ilike(f"%{search}%")))
    if city:
        query = query.filter(Company.business_address.ilike(f"%{city}%"))

    companies = query.order_by(Company.name.asc()).all()
    return [_to_company_out(c) for c in companies]


@router.get("/caterers/{company_id}", response_model=CompanyOut)
def get_catering_company_detail(company_id: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id, Company.status == CompanyStatus.approved).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering company not found")
    return _to_company_out(company)


@router.get("/caterers/{company_id}/menus", response_model=list[MenuItemOut])
def get_caterer_menus(company_id: str, db: Session = Depends(get_db)):
    return db.query(MenuItem).filter(MenuItem.company_id == company_id, MenuItem.is_active.is_(True)).all()


@router.get("/caterers/{company_id}/packages", response_model=list[PackageOut])
def get_caterer_packages(company_id: str, db: Session = Depends(get_db)):
    return db.query(Package).filter(Package.company_id == company_id, Package.is_active.is_(True)).all()


# ── Inquiries & Bookings ─────────────────────────────────────────────────────
@router.post("/inquiries", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def submit_catering_inquiry(
    payload: CustomerEventInquiryCreate,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth

    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering company not found")

    # Link or auto-create CRM Customer record in caterer's database
    customer = (
        db.query(Customer)
        .filter(Customer.company_id == company.id, Customer.email == user.email, Customer.deleted_at.is_(None))
        .first()
    )
    if not customer:
        customer = Customer(
            company_id=company.id,
            name=user.full_name,
            email=user.email,
            phone=user.phone or "N/A",
            address=payload.venue_address or profile.default_address,
            notes="Registered PLATED Marketplace Customer",
        )
        db.add(customer)
        db.flush()

    event = Event(
        company_id=company.id,
        customer_id=customer.id,
        created_by=user.id,
        title=payload.title,
        event_type=payload.event_type,
        event_date=payload.event_date,
        guest_count=payload.guest_count,
        venue_name=payload.venue_name,
        venue_address=payload.venue_address,
        catering_requirement=payload.catering_requirement,
        special_instructions=payload.special_instructions,
        status=EventStatus.enquiry,
    )
    db.add(event)
    log_action(db, user.id, "catering_inquiry_submitted", "event", event.id, company_id=company.id)
    db.commit()
    db.refresh(event)
    return event


@router.get("/events", response_model=list[EventOut])
def list_my_catering_events(
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Lists all catering bookings / inquiries placed by the authenticated customer."""
    user, profile = auth
    customer_ids = [c.id for c in db.query(Customer.id).filter(Customer.email == user.email).all()]

    return (
        db.query(Event)
        .filter((Event.customer_id.in_(customer_ids)) | (Event.created_by == user.id))
        .filter(Event.deleted_at.is_(None))
        .order_by(Event.event_date.desc())
        .all()
    )


@router.get("/events/{event_id}", response_model=EventOut)
def get_catering_event_detail(
    event_id: str,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth
    customer_ids = [c.id for c in db.query(Customer.id).filter(Customer.email == user.email).all()]

    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            (Event.customer_id.in_(customer_ids)) | (Event.created_by == user.id),
            Event.deleted_at.is_(None),
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return event


# ── Quotations ───────────────────────────────────────────────────────────────
@router.get("/events/{event_id}/quotations", response_model=list[QuotationOut])
def list_event_quotations(
    event_id: str,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    event = get_catering_event_detail(event_id, auth, db)
    return (
        db.query(Quotation)
        .filter(Quotation.event_id == event.id, Quotation.status.in_([QuotationStatus.sent, QuotationStatus.accepted, QuotationStatus.rejected]))
        .order_by(Quotation.created_at.desc())
        .all()
    )


@router.post("/events/{event_id}/quotations/{quote_id}/accept", response_model=QuotationOut)
def accept_quotation(
    event_id: str,
    quote_id: str,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth
    event = get_catering_event_detail(event_id, auth, db)

    quote = db.query(Quotation).filter(Quotation.id == quote_id, Quotation.event_id == event.id).first()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    quote.status = QuotationStatus.accepted
    quote.responded_at = datetime.now(timezone.utc)

    # Automatically confirm event
    event.status = EventStatus.confirmed

    log_action(db, user.id, "quotation_accepted", "quotation", quote.id, company_id=event.company_id)
    db.commit()
    db.refresh(quote)
    return quote


# ── Invoices & Payments ──────────────────────────────────────────────────────
@router.get("/events/{event_id}/invoices", response_model=list[InvoiceOut])
def list_event_invoices(
    event_id: str,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    event = get_catering_event_detail(event_id, auth, db)
    return db.query(Invoice).filter(Invoice.event_id == event.id).order_by(Invoice.created_at.desc()).all()


@router.get("/invoices", response_model=list[InvoiceOut])
def list_all_customer_invoices(
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth
    customer_ids = [c.id for c in db.query(Customer.id).filter(Customer.email == user.email).all()]
    event_ids = [
        e.id
        for e in db.query(Event.id)
        .filter((Event.customer_id.in_(customer_ids)) | (Event.created_by == user.id))
        .all()
    ]
    return db.query(Invoice).filter(Invoice.event_id.in_(event_ids)).order_by(Invoice.created_at.desc()).all()


@router.post("/invoices/{invoice_id}/pay", response_model=InvoiceOut)
def pay_invoice(
    invoice_id: str,
    payload: CustomerPaymentCreate,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    event = get_catering_event_detail(invoice.event_id, auth, db)

    paid_sum = sum(p.amount for p in invoice.payments if p.status == PaymentStatus.paid)
    new_paid = paid_sum + payload.amount

    payment = Payment(
        invoice_id=invoice.id,
        event_id=event.id,
        company_id=event.company_id,
        amount=payload.amount,
        type=PaymentType.milestone if paid_sum > 0 else PaymentType.advance,
        status=PaymentStatus.paid,
        provider=payload.provider or getattr(payload, "payment_method", None) or "card",
        provider_ref=payload.provider_ref or getattr(payload, "reference_note", None) or f"PAY_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)

    if new_paid >= invoice.total:
        invoice.status = InvoiceStatus.paid
    else:
        invoice.status = InvoiceStatus.partially_paid

    log_action(db, user.id, "invoice_payment_completed", "invoice", invoice.id, company_id=event.company_id, new_value={"amount": payload.amount})
    db.commit()
    db.refresh(invoice)
    return invoice


# ── Feedback & Ratings ───────────────────────────────────────────────────────
@router.post("/events/{event_id}/feedback", response_model=FeedbackOut)
def submit_caterer_feedback(
    event_id: str,
    payload: CustomerFeedbackCreate,
    auth: tuple = Depends(require_customer),
    db: Session = Depends(get_db),
):
    user, profile = auth
    event = get_catering_event_detail(event_id, auth, db)

    existing = db.query(Feedback).filter(Feedback.event_id == event.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already submitted feedback for this event.")

    comment_text = payload.comment or payload.feedback or ""
    feedback = Feedback(
        event_id=event.id,
        overall_rating=payload.rating,
        food_rating=payload.rating,
        service_rating=payload.rating,
        staff_rating=payload.rating,
        comment=comment_text,
    )
    db.add(feedback)
    log_action(db, user.id, "event_feedback_submitted", "feedback", feedback.id, company_id=event.company_id)
    db.commit()
    db.refresh(feedback)
    return feedback
