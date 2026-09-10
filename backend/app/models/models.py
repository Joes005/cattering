import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    organizer = "organizer"
    vendor = "vendor"
    admin = "admin"


class BookingStatus(str, enum.Enum):
    pending = "pending"      # organizer requested a quote
    quoted = "quoted"        # vendor responded with a price
    accepted = "accepted"    # organizer accepted the quote
    rejected = "rejected"    # vendor declined
    confirmed = "confirmed"  # payment/deposit received
    completed = "completed"  # event happened
    cancelled = "cancelled"


class EventStatus(str, enum.Enum):
    planning = "planning"
    booked = "booked"
    completed = "completed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.organizer)
    phone = Column(String(30))
    avatar_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vendor_profile = relationship("VendorProfile", back_populates="user", uselist=False)
    events = relationship("Event", back_populates="organizer")


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50))


class VendorProfile(Base):
    __tablename__ = "vendor_profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False)
    business_name = Column(String(150), nullable=False)
    description = Column(Text)
    cuisine_types = Column(String(300))  # comma-separated tags, e.g. "South Indian,Continental"
    city = Column(String(100), index=True)
    address = Column(String(300))
    cover_image_url = Column(String(500))
    logo_url = Column(String(500))
    price_per_plate_min = Column(Float, default=0)
    price_per_plate_max = Column(Float, default=0)
    min_guests = Column(Integer, default=0)
    max_guests = Column(Integer, default=0)
    avg_rating = Column(Float, default=0)
    rating_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="vendor_profile")
    packages = relationship("Package", back_populates="vendor", cascade="all, delete-orphan")


class Package(Base):
    __tablename__ = "packages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    vendor_id = Column(UUID(as_uuid=False), ForeignKey("vendor_profiles.id"), nullable=False)
    category_id = Column(UUID(as_uuid=False), ForeignKey("categories.id"), nullable=True)
    title = Column(String(150), nullable=False)
    description = Column(Text)
    price_per_plate = Column(Float, nullable=False)
    min_guests = Column(Integer, default=50)
    max_guests = Column(Integer, default=500)
    menu_items = Column(Text)  # newline or comma separated menu highlights
    image_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vendor = relationship("VendorProfile", back_populates="packages")
    category = relationship("Category")


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organizer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    event_type = Column(String(100))  # Wedding, Corporate, Birthday, etc.
    event_date = Column(DateTime(timezone=True), nullable=False)
    guest_count = Column(Integer, default=0)
    location = Column(String(300))
    budget_min = Column(Float, default=0)
    budget_max = Column(Float, default=0)
    notes = Column(Text)
    status = Column(Enum(EventStatus), default=EventStatus.planning)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organizer = relationship("User", back_populates="events")
    bookings = relationship("Booking", back_populates="event", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = Column(UUID(as_uuid=False), ForeignKey("events.id"), nullable=False)
    package_id = Column(UUID(as_uuid=False), ForeignKey("packages.id"), nullable=False)
    vendor_id = Column(UUID(as_uuid=False), ForeignKey("vendor_profiles.id"), nullable=False)
    organizer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.pending)
    quoted_price = Column(Float)
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event = relationship("Event", back_populates="bookings")
    package = relationship("Package")
    vendor = relationship("VendorProfile")
    organizer = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    booking_id = Column(UUID(as_uuid=False), ForeignKey("bookings.id"), nullable=True)
    sender_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    receiver_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    booking_id = Column(UUID(as_uuid=False), ForeignKey("bookings.id"), unique=True, nullable=False)
    vendor_id = Column(UUID(as_uuid=False), ForeignKey("vendor_profiles.id"), nullable=False)
    organizer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    booking_id = Column(UUID(as_uuid=False), ForeignKey("bookings.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="usd")
    status = Column(String(30), default="pending")
    stripe_session_id = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
