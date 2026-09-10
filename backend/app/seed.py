from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.models.models import (
    Booking,
    BookingStatus,
    Category,
    Event,
    Package,
    User,
    UserRole,
    VendorProfile,
)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

CATEGORIES = [
    ("Wedding Catering", "wedding-catering", "💍"),
    ("Corporate Events", "corporate-events", "💼"),
    ("Birthday Parties", "birthday-parties", "🎂"),
    ("Live Counters", "live-counters", "🍳"),
    ("Buffet Service", "buffet-service", "🍽"),
]


def get_or_create_category(name, slug, icon):
    cat = db.query(Category).filter(Category.slug == slug).first()
    if not cat:
        cat = Category(name=name, slug=slug, icon=icon)
        db.add(cat)
        db.commit()
        db.refresh(cat)
    return cat


def get_or_create_user(name, email, password, role, phone=None):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(name=name, email=email, password_hash=hash_password(password), role=role, phone=phone)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def main():
    categories = [get_or_create_category(*c) for c in CATEGORIES]

    admin = get_or_create_user("Admin", "admin@plated.com", "Admin@1234", UserRole.admin)

    vendor_user = get_or_create_user(
        "Grand Regency Catering", "hr@grandregency.com", "Vendor@123", UserRole.vendor, "+1-555-0100"
    )
    vendor_profile = db.query(VendorProfile).filter(VendorProfile.user_id == vendor_user.id).first()
    if not vendor_profile:
        vendor_profile = VendorProfile(
            user_id=vendor_user.id,
            business_name="Grand Regency Catering",
            description="Full-service catering for weddings and large corporate events.",
            cuisine_types="Continental,South Indian,North Indian",
            city="Chennai",
            address="12 Anna Salai, Chennai",
            price_per_plate_min=350,
            price_per_plate_max=1200,
            min_guests=50,
            max_guests=1000,
            avg_rating=4.7,
            rating_count=32,
            is_verified=True,
        )
        db.add(vendor_profile)
        db.commit()
        db.refresh(vendor_profile)

    if not db.query(Package).filter(Package.vendor_id == vendor_profile.id).first():
        db.add_all(
            [
                Package(
                    vendor_id=vendor_profile.id,
                    category_id=categories[0].id,
                    title="Royal Wedding Buffet",
                    description="A lavish multi-cuisine buffet with live counters, perfect for a 300+ guest wedding.",
                    price_per_plate=850,
                    min_guests=200,
                    max_guests=1000,
                    menu_items="Live Chaat Counter, Paneer Tikka, Chicken Chettinad, Biryani, Dessert Bar",
                ),
                Package(
                    vendor_id=vendor_profile.id,
                    category_id=categories[1].id,
                    title="Corporate Lunch Package",
                    description="Efficient, professional plated lunch service for offices and conferences.",
                    price_per_plate=400,
                    min_guests=30,
                    max_guests=200,
                    menu_items="Salad Bar, Grilled Chicken/Paneer, Rice, Curry, Dessert",
                ),
            ]
        )
        db.commit()

    organizer = get_or_create_user(
        "Marco Rossi", "marco@plated.com", "Seeker@123", UserRole.organizer, "+1-555-0200"
    )

    if not db.query(Event).filter(Event.organizer_id == organizer.id).first():
        event = Event(
            organizer_id=organizer.id,
            title="Marco & Elena's Wedding",
            event_type="Wedding",
            event_date=datetime.now(timezone.utc) + timedelta(days=60),
            guest_count=250,
            location="Chennai, India",
            budget_min=150000,
            budget_max=250000,
            notes="Looking for multi-cuisine buffet with a live counter.",
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        package = db.query(Package).filter(Package.vendor_id == vendor_profile.id).first()
        booking = Booking(
            event_id=event.id,
            package_id=package.id,
            vendor_id=vendor_profile.id,
            organizer_id=organizer.id,
            status=BookingStatus.pending,
            message="Hi! We'd love a quote for ~250 guests.",
        )
        db.add(booking)
        db.commit()

    print("Seed complete.")
    print("Admin login:     admin@plated.com / Admin@1234")
    print("Vendor login:    hr@grandregency.com / Vendor@123")
    print("Organizer login: marco@plated.com / Seeker@123")


if __name__ == "__main__":
    main()
