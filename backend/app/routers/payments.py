from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_db
from app.models.models import Booking, Payment, User

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/checkout/{booking_id}")
def create_checkout_session(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking or booking.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if not booking.quoted_price:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking has no quoted price yet")

    if not settings.STRIPE_SECRET_KEY:
        # Stripe not configured — record a stub "pending" payment so the flow can be tested locally.
        payment = Payment(booking_id=booking.id, amount=booking.quoted_price, status="stub_pending")
        db.add(payment)
        db.commit()
        return {"checkout_url": None, "note": "Stripe not configured; payment recorded as stub_pending"}

    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(booking.quoted_price * 100),
                    "product_data": {"name": f"Booking deposit — {booking.package.title}"},
                },
                "quantity": 1,
            }
        ],
        success_url=f"{settings.CLIENT_URL}/bookings/{booking.id}?paid=1",
        cancel_url=f"{settings.CLIENT_URL}/bookings/{booking.id}?paid=0",
    )

    payment = Payment(
        booking_id=booking.id,
        amount=booking.quoted_price,
        status="pending",
        stripe_session_id=session.id,
    )
    db.add(payment)
    db.commit()
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    import stripe

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        payment = db.query(Payment).filter(Payment.stripe_session_id == session["id"]).first()
        if payment:
            payment.status = "paid"
            db.commit()

    return {"received": True}


@router.get("/history")
def payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payments = (
        db.query(Payment)
        .join(Booking)
        .filter(Booking.organizer_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "booking_id": p.booking_id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "created_at": p.created_at,
        }
        for p in payments
    ]
