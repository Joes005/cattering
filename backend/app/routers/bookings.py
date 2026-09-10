from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.models.models import Booking, BookingStatus, Event, EventStatus, Package, User, VendorProfile
from app.schemas.schemas import BookingCreate, BookingDetailOut, BookingOut, BookingQuote, BookingStatusUpdate

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut)
def request_booking(
    payload: BookingCreate,
    current_user: User = Depends(require_role("organizer", "admin")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event or event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    package = db.query(Package).filter(Package.id == payload.package_id).first()
    if not package:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")

    booking = Booking(
        event_id=event.id,
        package_id=package.id,
        vendor_id=package.vendor_id,
        organizer_id=current_user.id,
        message=payload.message,
        status=BookingStatus.pending,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/mine", response_model=list[BookingOut])
def my_bookings_as_organizer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Booking)
        .filter(Booking.organizer_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )


@router.get("/vendor/incoming", response_model=list[BookingOut])
def incoming_bookings_for_vendor(
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    profile = db.query(VendorProfile).filter(VendorProfile.user_id == current_user.id).first()
    if not profile:
        return []
    return (
        db.query(Booking)
        .filter(Booking.vendor_id == profile.id)
        .order_by(Booking.created_at.desc())
        .all()
    )


@router.get("/{booking_id}", response_model=BookingDetailOut)
def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.package),
            joinedload(Booking.vendor),
            joinedload(Booking.event),
            joinedload(Booking.organizer),
        )
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    _ensure_booking_party(booking, current_user, db)
    return booking


@router.patch("/{booking_id}/quote", response_model=BookingOut)
def quote_booking(
    booking_id: str,
    payload: BookingQuote,
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.vendor.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking request")

    booking.quoted_price = payload.quoted_price
    if payload.message:
        booking.message = payload.message
    booking.status = BookingStatus.quoted
    db.commit()
    db.refresh(booking)
    return booking


@router.patch("/{booking_id}/status", response_model=BookingOut)
def update_booking_status(
    booking_id: str,
    payload: BookingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    _ensure_booking_party(booking, current_user, db)

    booking.status = payload.status
    if payload.status == BookingStatus.confirmed:
        booking.event.status = EventStatus.booked
    if payload.status == BookingStatus.completed:
        booking.event.status = EventStatus.completed
    db.commit()
    db.refresh(booking)
    return booking


def _ensure_booking_party(booking: Booking, current_user: User, db: Session):
    is_organizer = booking.organizer_id == current_user.id
    is_vendor = booking.vendor.user_id == current_user.id
    is_admin = current_user.role.value == "admin"
    if not (is_organizer or is_vendor or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not part of this booking")
