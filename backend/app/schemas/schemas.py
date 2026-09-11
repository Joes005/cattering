from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import (
    AssignmentStatus,
    AttendanceStatus,
    CateringRequirement,
    CompanyStatus,
    DocumentType,
    DocumentVisibility,
    EmploymentRole,
    EventStaffRole,
    EventStatus,
    GlobalRole,
    InvoiceStatus,
    MemberStatus,
    MenuVegType,
    PaymentStatus,
    PaymentType,
    PricingType,
    QuotationStatus,
    TaskPhase,
    TaskStatus,
    UserStatus,
)


# ── Auth / Users ──────────────────────────────────────────────────────────
class ClientSignup(BaseModel):
    """Public self-signup — always creates a `client` account."""

    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    global_role: GlobalRole
    status: UserStatus
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=6)


class CompanyMembershipOut(BaseModel):
    company_id: str
    company_name: str
    employment_role: EmploymentRole
    permissions: list[str]


class TokenOut(BaseModel):
    token: str
    user: UserOut
    memberships: list[CompanyMembershipOut] = []
    permissions: list[str] = []  # fixed set for admin/client global roles


# ── Companies ─────────────────────────────────────────────────────────────
class CompanyCreate(BaseModel):
    name: str
    owner_name: str
    owner_email: EmailStr
    owner_password: str = Field(min_length=6)
    gst_number: Optional[str] = None
    currency: str = "INR"


class CompanyOut(BaseModel):
    id: str
    name: str
    slug: str
    logo_url: Optional[str] = None
    gst_number: Optional[str] = None
    currency: str
    status: CompanyStatus
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyPublicOut(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    gst_number: Optional[str] = None
    currency: Optional[str] = None
    status: Optional[CompanyStatus] = None


# ── Company members (employees / owner / manager) ──────────────────────────
class CompanyMemberCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = None
    employment_role: EmploymentRole = EmploymentRole.staff
    job_title: Optional[str] = None


class CompanyMemberOut(BaseModel):
    id: str
    company_id: str
    user: UserOut
    employment_role: EmploymentRole
    job_title: Optional[str] = None
    status: MemberStatus
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyMemberUpdate(BaseModel):
    employment_role: Optional[EmploymentRole] = None
    job_title: Optional[str] = None
    status: Optional[MemberStatus] = None


class PermissionOverrideSet(BaseModel):
    grants: list[str] = []
    revokes: list[str] = []


# ── Clients (CRM) ────────────────────────────────────────────────────────
class ClientCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class ClientOut(BaseModel):
    id: str
    company_id: str
    user_id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Events ────────────────────────────────────────────────────────────────
class EventCreate(BaseModel):
    title: Optional[str] = None
    event_type: str
    event_date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    guest_count: int = Field(ge=1)
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    catering_requirement: CateringRequirement = CateringRequirement.mixed
    special_instructions: Optional[str] = None


class ClientEventCreate(EventCreate):
    company_id: str


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    guest_count: Optional[int] = Field(default=None, ge=1)
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    catering_requirement: Optional[CateringRequirement] = None
    special_instructions: Optional[str] = None


class EventStatusUpdate(BaseModel):
    status: EventStatus
    note: Optional[str] = None


class EventStatusHistoryOut(BaseModel):
    id: str
    from_status: Optional[EventStatus] = None
    to_status: EventStatus
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventOut(BaseModel):
    id: str
    company_id: str
    client_id: str
    title: str
    event_type: str
    event_date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    guest_count: int
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    catering_requirement: CateringRequirement
    special_instructions: Optional[str] = None
    status: EventStatus
    readiness_score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EventDetailOut(EventOut):
    client: ClientOut
    company: CompanyPublicOut
    status_history: list[EventStatusHistoryOut] = []


# ── Menus & packages ─────────────────────────────────────────────────────
class MenuCategoryCreate(BaseModel):
    name: str
    sort_order: int = 0


class MenuCategoryOut(BaseModel):
    id: str
    company_id: str
    name: str
    sort_order: int

    class Config:
        from_attributes = True


class MenuItemCreate(BaseModel):
    category_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    veg_type: MenuVegType = MenuVegType.veg
    dietary_tags: list[str] = []
    allergens: list[str] = []
    price: float = 0
    is_active: bool = True


class MenuItemOut(BaseModel):
    id: str
    company_id: str
    category_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    veg_type: MenuVegType
    dietary_tags: list[str] = []
    allergens: list[str] = []
    price: float
    is_active: bool

    class Config:
        from_attributes = True


class PackageItemCreate(BaseModel):
    menu_item_id: str
    note: Optional[str] = None


class PackageItemOut(BaseModel):
    id: str
    menu_item: MenuItemOut
    note: Optional[str] = None

    class Config:
        from_attributes = True


class PackageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pricing_type: PricingType = PricingType.per_guest
    price: float = Field(ge=0)
    min_guests: int = 0
    is_active: bool = True
    items: list[PackageItemCreate] = []


class PackageOut(BaseModel):
    id: str
    company_id: str
    name: str
    description: Optional[str] = None
    pricing_type: PricingType
    price: float
    min_guests: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PackageDetailOut(PackageOut):
    items: list[PackageItemOut] = []


# ── Quotations ────────────────────────────────────────────────────────────
class QuotationItemCreate(BaseModel):
    package_id: Optional[str] = None
    menu_item_id: Optional[str] = None
    description: Optional[str] = None
    quantity: int = 1
    unit_price: Optional[float] = None


class QuotationItemOut(BaseModel):
    id: str
    package_id: Optional[str] = None
    menu_item_id: Optional[str] = None
    description: str
    quantity: int
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True


class QuotationCreate(BaseModel):
    items: list[QuotationItemCreate] = Field(min_length=1)
    discount: float = 0
    tax_percent: float = 0
    service_charge: float = 0
    delivery_charge: float = 0
    advance_amount: float = 0
    valid_until: Optional[datetime] = None


class QuotationOut(BaseModel):
    id: str
    event_id: str
    company_id: str
    quote_number: str
    status: QuotationStatus
    subtotal: float
    discount: float
    tax_percent: float
    service_charge: float
    delivery_charge: float
    advance_amount: float
    total: float
    valid_until: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class QuotationDetailOut(QuotationOut):
    items: list[QuotationItemOut] = []


# ── Staff assignment ─────────────────────────────────────────────────────
class EventStaffCreate(BaseModel):
    company_member_id: str
    event_role: EventStaffRole
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None
    notes: Optional[str] = None


class EventStaffUpdate(BaseModel):
    event_role: Optional[EventStaffRole] = None
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None
    status: Optional[AssignmentStatus] = None
    notes: Optional[str] = None


class EventStaffOut(BaseModel):
    id: str
    event_id: str
    company_member_id: str
    member_name: str
    event_role: EventStaffRole
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None
    status: AssignmentStatus
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── Tasks ─────────────────────────────────────────────────────────────────
class EventTaskCreate(BaseModel):
    phase: TaskPhase
    title: str
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class EventTaskUpdate(BaseModel):
    title: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class EventTaskOut(BaseModel):
    id: str
    event_id: str
    phase: TaskPhase
    title: str
    assigned_to: Optional[str] = None
    status: TaskStatus
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True


# ── Attendance ────────────────────────────────────────────────────────────
class AttendanceOut(BaseModel):
    id: str
    company_member_id: str
    event_id: Optional[str] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus

    class Config:
        from_attributes = True


# ── Invoices ──────────────────────────────────────────────────────────────
class InvoiceItemOut(BaseModel):
    id: str
    description: str
    quantity: int
    rate: float
    amount: float

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    due_date: Optional[datetime] = None


class InvoiceOut(BaseModel):
    id: str
    event_id: str
    company_id: str
    invoice_number: str
    status: InvoiceStatus
    subtotal: float
    tax: float
    discount: float
    total: float
    due_date: Optional[datetime] = None
    created_at: datetime
    amount_paid: float = 0
    balance_due: float = 0

    class Config:
        from_attributes = True


class InvoiceDetailOut(InvoiceOut):
    items: list[InvoiceItemOut] = []


# ── Payments ──────────────────────────────────────────────────────────────
class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    type: PaymentType
    method: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: str
    invoice_id: Optional[str] = None
    event_id: str
    company_id: str
    amount: float
    type: PaymentType
    status: PaymentStatus
    provider: Optional[str] = None
    provider_ref: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Documents ─────────────────────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: str
    company_id: str
    event_id: Optional[str] = None
    type: DocumentType
    file_url: str
    uploaded_by: str
    visibility: DocumentVisibility
    created_at: datetime

    class Config:
        from_attributes = True


# ── Messages ──────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    body: str
    attachment_url: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    event_id: str
    sender_id: str
    sender_name: str
    body: str
    attachment_url: Optional[str] = None
    created_at: datetime


# ── Notifications ─────────────────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Feedback ──────────────────────────────────────────────────────────────
class FeedbackCreate(BaseModel):
    overall_rating: int = Field(ge=1, le=5)
    food_rating: Optional[int] = Field(default=None, ge=1, le=5)
    service_rating: Optional[int] = Field(default=None, ge=1, le=5)
    staff_rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: str
    event_id: str
    overall_rating: int
    food_rating: Optional[int] = None
    service_rating: Optional[int] = None
    staff_rating: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Inventory ─────────────────────────────────────────────────────────────
class InventoryItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str
    stock_qty: float = 0
    min_stock: float = 0


class InventoryItemOut(BaseModel):
    id: str
    company_id: str
    name: str
    category: Optional[str] = None
    unit: str
    stock_qty: float
    min_stock: float
    is_low_stock: bool = False

    class Config:
        from_attributes = True


class InventoryTransactionCreate(BaseModel):
    change_qty: float
    type: str
    event_id: Optional[str] = None


class InventoryTransactionOut(BaseModel):
    id: str
    item_id: str
    event_id: Optional[str] = None
    change_qty: float
    type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Audit logs ────────────────────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id: str
    company_id: Optional[str] = None
    actor_user_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    created_at: datetime


# ── Reports ───────────────────────────────────────────────────────────────
class SalesReportOut(BaseModel):
    total_enquiries: int
    total_quotations_sent: int
    quotations_accepted: int
    conversion_rate: float
    confirmed_bookings: int


class RevenueReportOut(BaseModel):
    total_revenue: float
    collected: float
    outstanding: float
    monthly: list[dict]


class EventsReportOut(BaseModel):
    by_status: dict
    by_type: dict
    by_month: dict


# ── Employee "my work" views ──────────────────────────────────────────────
class MyAssignmentOut(BaseModel):
    id: str
    event_id: str
    event_title: str
    event_date: datetime
    venue_name: Optional[str] = None
    guest_count: int
    event_role: EventStaffRole
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None
    status: AssignmentStatus
