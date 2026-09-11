import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.event_lifecycle import is_transition_allowed
from app.core.notify import notify
from app.core.security import get_accessible_event_or_404, require_permission
from app.db.database import get_db
from app.models.models import (
    Event,
    EventStatus,
    EventStatusHistory,
    MenuItem,
    Package,
    PricingType,
    Quotation,
    QuotationItem,
    QuotationStatus,
    User,
)
from app.schemas.schemas import QuotationCreate, QuotationDetailOut, QuotationItemCreate, QuotationOut

router = APIRouter(prefix="/api/companies/{company_id}/events/{event_id}/quotations", tags=["quotations"])


def _price_item(db: Session, company_id: str, event: Event, item: QuotationItemCreate) -> QuotationItem:
    if item.package_id:
        package = db.query(Package).filter(Package.id == item.package_id, Package.company_id == company_id).first()
        if not package:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
        quantity = event.guest_count if package.pricing_type == PricingType.per_guest else (item.quantity or 1)
        unit_price = package.price
        description = item.description or package.name
        return QuotationItem(
            package_id=package.id,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            line_total=unit_price * quantity,
        )

    if item.menu_item_id:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item.menu_item_id, MenuItem.company_id == company_id).first()
        if not menu_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
        quantity = item.quantity or 1
        unit_price = menu_item.price
        description = item.description or menu_item.name
        return QuotationItem(
            menu_item_id=menu_item.id,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            line_total=unit_price * quantity,
        )

    if not item.description or item.unit_price is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A custom line item needs a description and a unit price.",
        )
    quantity = item.quantity or 1
    return QuotationItem(
        description=item.description,
        quantity=quantity,
        unit_price=item.unit_price,
        line_total=item.unit_price * quantity,
    )


def _generate_quote_number() -> str:
    return f"QT-{datetime.now(timezone.utc):%Y%m}-{uuid.uuid4().hex[:6].upper()}"


@router.post("", response_model=QuotationDetailOut)
def create_quotation(
    company_id: str,
    event_id: str,
    payload: QuotationCreate,
    user: User = Depends(require_permission("quotes.create")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)

    quotation = Quotation(
        event_id=event.id,
        company_id=company_id,
        quote_number=_generate_quote_number(),
        discount=payload.discount,
        tax_percent=payload.tax_percent,
        service_charge=payload.service_charge,
        delivery_charge=payload.delivery_charge,
        advance_amount=payload.advance_amount,
        valid_until=payload.valid_until,
        created_by=user.id,
    )
    db.add(quotation)
    db.flush()

    quotation_items = [_price_item(db, company_id, event, item) for item in payload.items]
    subtotal = sum(qi.line_total for qi in quotation_items)
    after_discount = max(subtotal - payload.discount, 0)
    total = after_discount + after_discount * payload.tax_percent / 100 + payload.service_charge + payload.delivery_charge

    quotation.subtotal = subtotal
    quotation.total = total
    for qi in quotation_items:
        qi.quotation_id = quotation.id
        db.add(qi)

    db.commit()
    db.refresh(quotation)
    return quotation


@router.get("", response_model=list[QuotationOut])
def list_quotations(
    company_id: str,
    event_id: str,
    user: User = Depends(require_permission("quotes.view")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    return (
        db.query(Quotation)
        .filter(Quotation.event_id == event_id, Quotation.company_id == company_id)
        .order_by(Quotation.created_at.desc())
        .all()
    )


@router.get("/{quotation_id}", response_model=QuotationDetailOut)
def get_quotation(
    company_id: str,
    event_id: str,
    quotation_id: str,
    user: User = Depends(require_permission("quotes.view")),
    db: Session = Depends(get_db),
):
    get_accessible_event_or_404(db, user, company_id, event_id)
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id, Quotation.event_id == event_id, Quotation.company_id == company_id)
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return quotation


@router.post("/{quotation_id}/send", response_model=QuotationOut)
def send_quotation(
    company_id: str,
    event_id: str,
    quotation_id: str,
    user: User = Depends(require_permission("quotes.create")),
    db: Session = Depends(get_db),
):
    event = get_accessible_event_or_404(db, user, company_id, event_id)
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id, Quotation.event_id == event_id, Quotation.company_id == company_id)
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if quotation.status != QuotationStatus.draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a draft quotation can be sent")

    quotation.status = QuotationStatus.sent
    quotation.sent_at = datetime.now(timezone.utc)

    # Auto-advance a fresh enquiry through quotation_sent -> awaiting_approval so the
    # client is prompted to review as soon as a quotation goes out.
    for next_status in (EventStatus.quotation_sent, EventStatus.awaiting_approval):
        if is_transition_allowed(event.status, next_status):
            db.add(EventStatusHistory(event_id=event.id, from_status=event.status, to_status=next_status))
            event.status = next_status

    if event.client.user_id:
        notify(
            db,
            event.client.user_id,
            type="quotation_sent",
            title="Your quotation is ready",
            body=f"A quotation for {event.title} (₹{quotation.total:,.0f}) is ready for your review.",
            company_id=company_id,
            related_entity_type="event",
            related_entity_id=event.id,
        )

    db.commit()
    db.refresh(quotation)
    return quotation
