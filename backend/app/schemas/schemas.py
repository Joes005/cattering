from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import BookingStatus, EventStatus, UserRole


# ── Auth / Users ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole = UserRole.organizer
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    token: str
    user: UserOut


class UserSummaryOut(BaseModel):
    id: str
    name: str
    role: UserRole

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=6)


# ── Categories ────────────────────────────────────────────────────────────
class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True


# ── Vendor profiles ───────────────────────────────────────────────────────
class VendorProfileCreate(BaseModel):
    business_name: str
    description: Optional[str] = None
    cuisine_types: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    cover_image_url: Optional[str] = None
    logo_url: Optional[str] = None
    price_per_plate_min: float = 0
    price_per_plate_max: float = 0
    min_guests: int = 0
    max_guests: int = 0


class VendorProfileOut(BaseModel):
    id: str
    user_id: str
    business_name: str
    description: Optional[str] = None
    cuisine_types: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    cover_image_url: Optional[str] = None
    logo_url: Optional[str] = None
    price_per_plate_min: float
    price_per_plate_max: float
    min_guests: int
    max_guests: int
    avg_rating: float
    rating_count: int
    is_verified: bool

    class Config:
        from_attributes = True


# ── Packages ──────────────────────────────────────────────────────────────
class PackageCreate(BaseModel):
    category_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    price_per_plate: float
    min_guests: int = 50
    max_guests: int = 500
    menu_items: Optional[str] = None
    image_url: Optional[str] = None


class PackageOut(BaseModel):
    id: str
    vendor_id: str
    category_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    price_per_plate: float
    min_guests: int
    max_guests: int
    menu_items: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class PackageWithVendorOut(PackageOut):
    vendor: VendorProfileOut


# ── Events ────────────────────────────────────────────────────────────────
class EventCreate(BaseModel):
    title: str
    event_type: str
    event_date: datetime
    guest_count: int = 0
    location: Optional[str] = None
    budget_min: float = 0
    budget_max: float = 0
    notes: Optional[str] = None


class EventOut(BaseModel):
    id: str
    organizer_id: str
    title: str
    event_type: str
    event_date: datetime
    guest_count: int
    location: Optional[str] = None
    budget_min: float
    budget_max: float
    notes: Optional[str] = None
    status: EventStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ── Bookings ──────────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    event_id: str
    package_id: str
    message: Optional[str] = None


class BookingQuote(BaseModel):
    quoted_price: float
    message: Optional[str] = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BookingOut(BaseModel):
    id: str
    event_id: str
    package_id: str
    vendor_id: str
    organizer_id: str
    status: BookingStatus
    quoted_price: Optional[float] = None
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookingWithPackageVendorOut(BookingOut):
    package: PackageOut
    vendor: VendorProfileOut


class BookingDetailOut(BookingOut):
    package: PackageOut
    vendor: VendorProfileOut
    event: EventOut
    organizer: UserSummaryOut


class EventDetailOut(EventOut):
    bookings: list[BookingWithPackageVendorOut] = []


# ── Messages ──────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    receiver_id: str
    booking_id: Optional[str] = None
    body: str


class MessageOut(BaseModel):
    id: str
    booking_id: Optional[str] = None
    sender_id: str
    receiver_id: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    other_user_id: str
    other_user_name: str
    last_message: str
    last_message_at: datetime
    unread_count: int


# ── Reviews ───────────────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    id: str
    booking_id: str
    vendor_id: str
    organizer_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Payments ──────────────────────────────────────────────────────────────
class PaymentOut(BaseModel):
    id: str
    booking_id: str
    amount: float
    currency: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
