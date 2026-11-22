import enum
import uuid

from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


def uuid_fk(table: str, nullable: bool = False, ondelete: str | None = None):
    return Column(
        UUID(as_uuid=False),
        ForeignKey(f"{table}.id", ondelete=ondelete),
        nullable=nullable,
    )


# ── The Four Platform Roles ──────────────────────────────────────────────
class UserRole(str, enum.Enum):
    admin = "admin"
    employer = "employer"
    employee = "employee"
    customer = "customer"


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class CompanyStatus(str, enum.Enum):
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class JobPostingStatus(str, enum.Enum):
    open = "open"
    filled = "filled"
    cancelled = "cancelled"
    completed = "completed"


class ApplicationStatus(str, enum.Enum):
    applied = "applied"
    shortlisted = "shortlisted"
    accepted = "accepted"
    rejected = "rejected"
    withdrawn = "withdrawn"


class AssignmentStatus(str, enum.Enum):
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    late = "late"
    absent = "absent"
    half_day = "half_day"


class PayoutStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    paid = "paid"
    disputed = "disputed"


class SubscriptionBillingCycle(str, enum.Enum):
    monthly = "monthly"
    annual = "annual"


class SubscriptionStatus(str, enum.Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    cancelled = "cancelled"
    expired = "expired"


class CommissionType(str, enum.Enum):
    catering_booking = "catering_booking"
    workforce_shift = "workforce_shift"


class CommissionCalculationMode(str, enum.Enum):
    percentage = "percentage"
    flat = "flat"


class TransactionType(str, enum.Enum):
    customer_payment = "customer_payment"
    subscription_fee = "subscription_fee"
    workforce_payout = "workforce_payout"
    commission_deduction = "commission_deduction"
    refund = "refund"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class DisputeStatus(str, enum.Enum):
    open = "open"
    under_review = "under_review"
    resolved = "resolved"
    dismissed = "dismissed"


class DisputeParty(str, enum.Enum):
    customer_employer = "customer_employer"
    employer_employee = "employer_employee"
    customer_platform = "customer_platform"
    employer_platform = "employer_platform"


class EventStatus(str, enum.Enum):
    enquiry = "enquiry"
    quotation_sent = "quotation_sent"
    awaiting_approval = "awaiting_approval"
    advance_pending = "advance_pending"
    confirmed = "confirmed"
    preparation = "preparation"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    rejected = "rejected"


class CateringRequirement(str, enum.Enum):
    veg = "veg"
    non_veg = "non_veg"
    mixed = "mixed"
    jain = "jain"
    vegan = "vegan"
    custom = "custom"


class MenuVegType(str, enum.Enum):
    veg = "veg"
    non_veg = "non_veg"
    egg = "egg"


class PricingType(str, enum.Enum):
    per_guest = "per_guest"
    flat = "flat"


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"


class TaskPhase(str, enum.Enum):
    pre_event = "pre_event"
    event_day = "event_day"
    post_event = "post_event"


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    partially_paid = "partially_paid"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"


class PaymentType(str, enum.Enum):
    advance = "advance"
    partial = "partial"
    final = "final"
    refund = "refund"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class InventoryTxnType(str, enum.Enum):
    purchase = "purchase"
    usage = "usage"
    adjustment = "adjustment"
    wastage = "wastage"


class DocumentType(str, enum.Enum):
    quotation = "quotation"
    contract = "contract"
    invoice = "invoice"
    receipt = "receipt"
    menu_pdf = "menu_pdf"
    id_proof = "id_proof"
    other = "other"


class DocumentVisibility(str, enum.Enum):
    internal = "internal"
    workforce = "workforce"
    public = "public"


# ── Domain 1: Identity & Authentication ───────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    role = Column(Enum(UserRole), nullable=False, index=True)
    email = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    phone = Column(String(30), nullable=False)
    avatar_url = Column(String(500))
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.active, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", back_populates="owner", uselist=False, foreign_keys="Company.owner_id")
    companies = relationship("Company", back_populates="owner", foreign_keys="Company.owner_id", overlaps="company")
    employee_profile = relationship("EmployeeProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    customer_profile = relationship("CustomerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    default_address = Column(Text, nullable=True)
    city = Column(String(100), nullable=False, default="Chennai")
    preferred_cuisine = Column(ARRAY(String), default=list)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="customer_profile")


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(30), nullable=True)
    location = Column(String(150), nullable=False, default="Chennai, Tamil Nadu")
    skills = Column(ARRAY(String), default=list)
    work_experience_years = Column(Float, default=0.0)
    preferred_work_type = Column(String(50), default="flexible")
    availability_status = Column(String(50), default="available")
    preferred_days = Column(ARRAY(String), default=list)
    bio = Column(Text, nullable=True)
    rating = Column(Float, default=5.0)
    total_completed_events = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="employee_profile")
    applications = relationship("JobApplication", back_populates="employee", cascade="all, delete-orphan")
    assignments = relationship("EmployeeAssignment", back_populates="employee")
    earnings = relationship("EmployeeEarning", back_populates="employee")


# ── Domain 2: Business & Catering Company ─────────────────────────────────
class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True, nullable=False, index=True)
    business_type = Column(String(100), default="Catering Service")
    business_address = Column(Text, nullable=True)
    gst_number = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    brand_settings = Column(JSONB, default=dict)
    currency = Column(String(10), default="INR")
    status = Column(Enum(CompanyStatus), nullable=False, default=CompanyStatus.pending_approval, index=True)
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", foreign_keys=[owner_id], back_populates="company")
    customers = relationship("Customer", back_populates="company", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="company", cascade="all, delete-orphan")
    job_postings = relationship("JobPosting", back_populates="company", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="company", cascade="all, delete-orphan")
    commission_ledgers = relationship("CommissionLedger", back_populates="company", cascade="all, delete-orphan")


# ── Domain 3: Customer Management (Pure Business Data) ───────────────────
class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    name = Column(String(120), nullable=False)
    email = Column(String(160), nullable=True)
    phone = Column(String(30), nullable=False)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", back_populates="customers")
    events = relationship("Event", back_populates="customer")


# ── Domain 4: Event & Operations ──────────────────────────────────────────
class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    customer_id = uuid_fk("customers", nullable=False, ondelete="RESTRICT")
    created_by = uuid_fk("users", nullable=False)
    title = Column(String(150), nullable=False)
    event_type = Column(String(100), nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    guest_count = Column(Integer, default=1)
    venue_name = Column(String(200), nullable=True)
    venue_address = Column(String(300), nullable=True)
    catering_requirement = Column(Enum(CateringRequirement), default=CateringRequirement.mixed)
    special_instructions = Column(Text, nullable=True)
    status = Column(Enum(EventStatus), nullable=False, default=EventStatus.enquiry, index=True)
    readiness_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", back_populates="events")
    customer = relationship("Customer", back_populates="events")
    status_history = relationship(
        "EventStatusHistory", back_populates="event", cascade="all, delete-orphan", order_by="EventStatusHistory.created_at"
    )
    tasks = relationship("EventTask", back_populates="event", cascade="all, delete-orphan")
    job_postings = relationship("JobPosting", back_populates="event", cascade="all, delete-orphan")
    assignments = relationship("EmployeeAssignment", back_populates="event", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="event", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="event", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="event", cascade="all, delete-orphan")


class EventStatusHistory(Base):
    __tablename__ = "event_status_history"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    from_status = Column(Enum(EventStatus), nullable=True)
    to_status = Column(Enum(EventStatus), nullable=False)
    changed_by = uuid_fk("users", nullable=True)
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="status_history")


class EventTask(Base):
    __tablename__ = "event_tasks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    phase = Column(Enum(TaskPhase), nullable=False)
    title = Column(String(200), nullable=False)
    assigned_to_user_id = uuid_fk("users", nullable=True, ondelete="SET NULL")
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.todo)
    due_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)

    event = relationship("Event", back_populates="tasks")


# ── Domain 5: Workforce Marketplace ──────────────────────────────────────
class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    role_title = Column(String(100), nullable=False)  # e.g. "Server", "Chef", "Kitchen Helper"
    description = Column(Text, nullable=True)
    required_count = Column(Integer, nullable=False, default=1)
    filled_count = Column(Integer, nullable=False, default=0)
    shift_start = Column(DateTime(timezone=True), nullable=False)
    shift_end = Column(DateTime(timezone=True), nullable=False)
    pay_rate = Column(Float, nullable=False)
    pay_type = Column(String(30), default="fixed_shift")  # "fixed_shift" or "hourly"
    location = Column(String(200), nullable=False)
    status = Column(Enum(JobPostingStatus), nullable=False, default=JobPostingStatus.open, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="job_postings")
    event = relationship("Event", back_populates="job_postings")
    applications = relationship("JobApplication", back_populates="job_posting", cascade="all, delete-orphan")
    assignments = relationship("EmployeeAssignment", back_populates="job_posting")


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (UniqueConstraint("job_posting_id", "employee_id", name="uq_job_application"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    job_posting_id = uuid_fk("job_postings", nullable=False, ondelete="CASCADE")
    employee_id = uuid_fk("employee_profiles", nullable=False, ondelete="CASCADE")
    cover_note = Column(Text, nullable=True)
    status = Column(Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.applied, index=True)
    employer_notes = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    job_posting = relationship("JobPosting", back_populates="applications")
    employee = relationship("EmployeeProfile", back_populates="applications")


class EmployeeAssignment(Base):
    __tablename__ = "employee_assignments"
    __table_args__ = (UniqueConstraint("event_id", "employee_id", name="uq_event_employee_assignment"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    job_posting_id = uuid_fk("job_postings", nullable=True, ondelete="SET NULL")
    employee_id = uuid_fk("employee_profiles", nullable=False, ondelete="RESTRICT")
    event_role = Column(String(100), nullable=False)
    shift_start = Column(DateTime(timezone=True), nullable=False)
    shift_end = Column(DateTime(timezone=True), nullable=False)
    agreed_pay = Column(Float, nullable=False, default=0.0)
    status = Column(Enum(AssignmentStatus), nullable=False, default=AssignmentStatus.confirmed, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="assignments")
    company = relationship("Company")
    job_posting = relationship("JobPosting", back_populates="assignments")
    employee = relationship("EmployeeProfile", back_populates="assignments")
    attendance = relationship("Attendance", back_populates="assignment", uselist=False, cascade="all, delete-orphan")
    earning = relationship("EmployeeEarning", back_populates="assignment", uselist=False, cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    assignment_id = Column(
        UUID(as_uuid=False), ForeignKey("employee_assignments.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    check_in = Column(DateTime(timezone=True), nullable=True)
    check_out = Column(DateTime(timezone=True), nullable=True)
    hours_worked = Column(Float, default=0.0)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.present)
    verified_by_employer = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    assignment = relationship("EmployeeAssignment", back_populates="attendance")


class EmployeeEarning(Base):
    __tablename__ = "employee_earnings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    assignment_id = Column(
        UUID(as_uuid=False), ForeignKey("employee_assignments.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    employee_id = uuid_fk("employee_profiles", nullable=False, ondelete="RESTRICT")
    company_id = uuid_fk("companies", nullable=False, ondelete="RESTRICT")
    amount = Column(Float, nullable=False, default=0.0)
    status = Column(Enum(PayoutStatus), nullable=False, default=PayoutStatus.pending, index=True)
    payment_reference = Column(String(100), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("EmployeeAssignment", back_populates="earning")
    employee = relationship("EmployeeProfile", back_populates="earnings")
    company = relationship("Company")


# ── Domain 6: Menus & Packages ───────────────────────────────────────────
class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    category_id = uuid_fk("menu_categories", nullable=True, ondelete="SET NULL")
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    veg_type = Column(Enum(MenuVegType), nullable=False, default=MenuVegType.veg)
    dietary_tags = Column(ARRAY(String), default=list)
    allergens = Column(ARRAY(String), default=list)
    price = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

    category = relationship("MenuCategory")


class Package(Base):
    __tablename__ = "packages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    pricing_type = Column(Enum(PricingType), nullable=False, default=PricingType.per_guest)
    price = Column(Float, nullable=False)
    min_guests = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("PackageItem", back_populates="package", cascade="all, delete-orphan")


class PackageItem(Base):
    __tablename__ = "package_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    package_id = uuid_fk("packages", nullable=False, ondelete="CASCADE")
    menu_item_id = uuid_fk("menu_items", nullable=False, ondelete="CASCADE")
    note = Column(String(255), nullable=True)

    package = relationship("Package", back_populates="items")
    menu_item = relationship("MenuItem")


# ── Domain 7: Financial Management ───────────────────────────────────────
class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    quote_number = Column(String(40), unique=True, nullable=False)
    status = Column(Enum(QuotationStatus), nullable=False, default=QuotationStatus.draft)
    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    tax_percent = Column(Float, default=5.0)
    service_charge = Column(Float, default=0.0)
    delivery_charge = Column(Float, default=0.0)
    advance_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    created_by = uuid_fk("users", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    quotation_id = uuid_fk("quotations", nullable=False, ondelete="CASCADE")
    package_id = uuid_fk("packages", nullable=True, ondelete="SET NULL")
    menu_item_id = uuid_fk("menu_items", nullable=True, ondelete="SET NULL")
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    line_total = Column(Float, default=0.0)

    quotation = relationship("Quotation", back_populates="items")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    invoice_number = Column(String(40), unique=True, nullable=False)
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.draft)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    invoice_id = uuid_fk("invoices", nullable=False, ondelete="CASCADE")
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    rate = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)

    invoice = relationship("Invoice", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    invoice_id = uuid_fk("invoices", nullable=True, ondelete="SET NULL")
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    amount = Column(Float, nullable=False)
    type = Column(Enum(PaymentType), nullable=False)
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.paid)
    provider = Column(String(50), default="manual")
    provider_ref = Column(String(200), nullable=True)
    paid_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    invoice = relationship("Invoice", back_populates="payments")


# ── Domain 8: Inventory Management ───────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    name = Column(String(150), nullable=False)
    contact = Column(String(150), nullable=True)
    category = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=True)
    unit = Column(String(30), nullable=False)
    stock_qty = Column(Float, default=0.0)
    min_stock = Column(Float, default=0.0)
    supplier_id = uuid_fk("suppliers", nullable=True, ondelete="SET NULL")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    item_id = uuid_fk("inventory_items", nullable=False, ondelete="CASCADE")
    event_id = uuid_fk("events", nullable=True, ondelete="SET NULL")
    change_qty = Column(Float, nullable=False)
    type = Column(Enum(InventoryTxnType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Domain 9: Platform Communication & Governance ────────────────────────
class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    event_id = uuid_fk("events", nullable=True, ondelete="SET NULL")
    type = Column(Enum(DocumentType), nullable=False)
    file_url = Column(String(500), nullable=False)
    uploaded_by = uuid_fk("users", nullable=False)
    visibility = Column(Enum(DocumentVisibility), nullable=False, default=DocumentVisibility.internal)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="documents")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    sender_id = uuid_fk("users", nullable=False)
    body = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    sender = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = uuid_fk("users", nullable=False, ondelete="CASCADE")
    company_id = uuid_fk("companies", nullable=True, ondelete="CASCADE")
    type = Column(String(60), nullable=False)
    title = Column(String(150), nullable=False)
    body = Column(String(500), nullable=True)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(UUID(as_uuid=False), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events", nullable=False, ondelete="CASCADE")
    overall_rating = Column(Integer, nullable=False)
    food_rating = Column(Integer, nullable=True)
    service_rating = Column(Integer, nullable=True)
    staff_rating = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=True, ondelete="CASCADE")
    actor_user_id = uuid_fk("users", nullable=True, ondelete="SET NULL")
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=False), nullable=True)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Setting(Base):
    __tablename__ = "settings"
    __table_args__ = (UniqueConstraint("company_id", "key", name="uq_company_setting"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    key = Column(String(80), nullable=False)
    value = Column(JSONB, nullable=False)


# ── Domain 10: SaaS Subscriptions & Monetization ─────────────────────────
class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    monthly_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    annual_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    max_active_events_per_month = Column(Integer, nullable=False, default=5)
    max_customers = Column(Integer, nullable=False, default=50)
    max_job_postings_per_month = Column(Integer, nullable=False, default=10)
    custom_branding = Column(Boolean, nullable=False, default=False)
    analytics_tier = Column(String(30), nullable=False, default="basic")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    plan_id = uuid_fk("subscription_plans", nullable=False, ondelete="RESTRICT")
    billing_cycle = Column(Enum(SubscriptionBillingCycle), nullable=False, default=SubscriptionBillingCycle.monthly)
    status = Column(Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.trialing, index=True)
    current_period_start = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    payment_reference = Column(String(150), nullable=True)
    auto_renew = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")


# ── Domain 11: Marketplace Commission Engine ─────────────────────────────
class CommissionRule(Base):
    __tablename__ = "commission_rules"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    commission_type = Column(Enum(CommissionType), nullable=False)
    name = Column(String(100), nullable=False)
    calculation_mode = Column(Enum(CommissionCalculationMode), nullable=False, default=CommissionCalculationMode.percentage)
    rate = Column(Numeric(6, 2), nullable=False, default=5.00)
    flat_fee = Column(Numeric(12, 2), nullable=False, default=0.00)
    company_id = uuid_fk("companies", nullable=True, ondelete="CASCADE")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CommissionLedger(Base):
    __tablename__ = "commission_ledger"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    rule_id = uuid_fk("commission_rules", nullable=True, ondelete="SET NULL")
    commission_type = Column(Enum(CommissionType), nullable=False, index=True)
    event_id = uuid_fk("events", nullable=True, ondelete="SET NULL")
    assignment_id = uuid_fk("employee_assignments", nullable=True, ondelete="SET NULL")
    company_id = uuid_fk("companies", nullable=False, ondelete="CASCADE")
    employee_id = uuid_fk("employee_profiles", nullable=True, ondelete="SET NULL")
    gross_amount = Column(Numeric(12, 2), nullable=False)
    commission_rate = Column(Numeric(6, 2), nullable=False)
    commission_amount = Column(Numeric(12, 2), nullable=False)
    net_payout = Column(Numeric(12, 2), nullable=False)
    is_settled = Column(Boolean, nullable=False, default=False)
    settled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="commission_ledgers")


# ── Domain 12: Consolidated Financial Transactions ───────────────────────
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    transaction_number = Column(String(50), unique=True, nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False, index=True)
    company_id = uuid_fk("companies", nullable=True, ondelete="SET NULL")
    user_id = uuid_fk("users", nullable=True, ondelete="SET NULL")
    event_id = uuid_fk("events", nullable=True, ondelete="SET NULL")
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    gateway_provider = Column(String(50), nullable=False, default="manual")
    gateway_reference = Column(String(150), nullable=True)
    status = Column(Enum(TransactionStatus), nullable=False, default=TransactionStatus.completed, index=True)
    payment_method = Column(String(50), default="upi")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Domain 13: Disputes & Arbitration ────────────────────────────────────
class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    dispute_number = Column(String(40), unique=True, nullable=False)
    party_type = Column(Enum(DisputeParty), nullable=False)
    opened_by_user_id = uuid_fk("users", nullable=False)
    company_id = uuid_fk("companies", nullable=True, ondelete="SET NULL")
    event_id = uuid_fk("events", nullable=True, ondelete="SET NULL")
    assignment_id = uuid_fk("employee_assignments", nullable=True, ondelete="SET NULL")
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    claim_amount = Column(Numeric(12, 2), default=0.00)
    status = Column(Enum(DisputeStatus), nullable=False, default=DisputeStatus.open, index=True)
    resolution_summary = Column(Text, nullable=True)
    arbitrated_by = uuid_fk("users", nullable=True, ondelete="SET NULL")
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    opened_by = relationship("User", foreign_keys=[opened_by_user_id])
    arbitrator = relationship("User", foreign_keys=[arbitrated_by])
    messages = relationship("DisputeMessage", back_populates="dispute", cascade="all, delete-orphan", order_by="DisputeMessage.created_at")


class DisputeMessage(Base):
    __tablename__ = "dispute_messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    dispute_id = uuid_fk("disputes", nullable=False, ondelete="CASCADE")
    sender_user_id = uuid_fk("users", nullable=False)
    message = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dispute = relationship("Dispute", back_populates="messages")
    sender = relationship("User")


# ── Domain 14: Global Platform Settings ──────────────────────────────────
class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    key = Column(String(80), unique=True, nullable=False)
    value = Column(JSONB, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="general")
    updated_by = uuid_fk("users", nullable=True, ondelete="SET NULL")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
