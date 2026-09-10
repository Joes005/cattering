from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db.database import get_db
from app.models.models import Booking, BookingStatus, Review, User, VendorProfile
from app.schemas.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut)
def leave_review(
    payload: ReviewCreate,
    current_user: User = Depends(require_role("organizer", "admin")),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if not booking or booking.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.status != BookingStatus.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only completed bookings can be reviewed")
    if db.query(Review).filter(Review.booking_id == booking.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking already reviewed")

    review = Review(
        booking_id=booking.id,
        vendor_id=booking.vendor_id,
        organizer_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)

    vendor = db.query(VendorProfile).filter(VendorProfile.id == booking.vendor_id).first()
    total_points = vendor.avg_rating * vendor.rating_count + payload.rating
    vendor.rating_count += 1
    vendor.avg_rating = round(total_points / vendor.rating_count, 2)

    db.commit()
    db.refresh(review)
    return review


@router.get("/vendor/{vendor_id}", response_model=list[ReviewOut])
def vendor_reviews(vendor_id: str, db: Session = Depends(get_db)):
    return (
        db.query(Review)
        .filter(Review.vendor_id == vendor_id)
        .order_by(Review.created_at.desc())
        .all()
    )
