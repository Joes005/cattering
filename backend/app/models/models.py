import enum
import uuid

from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


def uuid_fk(table: str, nullable: bool = False):
    return Column(UUID(as_uuid=False), ForeignKey(f"{table}.id"), nullable=nullable)


# ── Enums ────────────────────────────────────────────────────────────────
class GlobalRole(str, enum.Enum):
    admin = "admin"
    company_user = "company_user"
    client = "client"


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"


class CompanyStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class EmploymentRole(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    staff = "staff"


class MemberStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class PermissionEffect(str, enum.Enum):
    grant = "grant"
    revoke = "revoke"


class CateringRequirement(str, enum.Enum):
    veg = "veg"
    non_veg = "non_veg"
    mixed = "mixed"
    jain = "jain"
    vegan = "vegan"
    custom = "custom"


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


class MenuVegType(str, enum.Enum):
    veg = "veg"
    non_veg = "non_veg"


class PricingType(str, enum.Enum):
    per_guest = "per_guest"
    flat = "flat"


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"


class EventStaffRole(str, enum.Enum):
    event_manager = "event_manager"
    chef = "chef"
    kitchen = "kitchen"
    service = "service"
    delivery = "delivery"
    setup = "setup"
    cleanup = "cleanup"


class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    declined = "declined"


class TaskPhase(str, enum.Enum):
    pre_event = "pre_event"
    event_day = "event_day"
    post_event = "post_event"


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    late = "late"
    absent = "absent"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    partially_paid = "partially_paid"
    paid = "paid"
    overdue = "overdue"


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


class DocumentType(str, enum.Enum):
    quotation = "quotation"
    contract = "contract"
    invoice = "invoice"
    receipt = "receipt"
    menu_pdf = "menu_pdf"
    other = "other"


class DocumentVisibility(str, enum.Enum):
    client = "client"
    internal = "internal"


# ── Identity & tenancy ──────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    full_name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    global_role = Column(Enum(GlobalRole), nullable=False, default=GlobalRole.client)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.active)
    phone = Column(String(30))
    avatar_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    company_memberships = relationship("CompanyMember", back_populates="user")


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True, nullable=False, index=True)
    logo_url = Column(String(500))
    brand_settings = Column(JSONB, default=dict)
    gst_number = Column(String(30))
    currency = Column(String(10), default="INR")
    status = Column(Enum(CompanyStatus), nullable=False, default=CompanyStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("CompanyMember", back_populates="company", cascade="all, delete-orphan")


class CompanyMember(Base):
    __tablename__ = "company_members"
    __table_args__ = (UniqueConstraint("company_id", "user_id", name="uq_company_member"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    user_id = uuid_fk("users")
    employment_role = Column(Enum(EmploymentRole), nullable=False, default=EmploymentRole.staff)
    job_title = Column(String(100))
    status = Column(Enum(MemberStatus), nullable=False, default=MemberStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="members")
    user = relationship("User", back_populates="company_memberships")
    permission_overrides = relationship("MemberPermissionOverride", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    key = Column(String(80), unique=True, nullable=False, index=True)  # e.g. "events.create"
    module = Column(String(50), nullable=False)
    description = Column(String(255))


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("employment_role", "permission_id", name="uq_role_permission"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    employment_role = Column(Enum(EmploymentRole), nullable=False)
    permission_id = uuid_fk("permissions")

    permission = relationship("Permission")


class MemberPermissionOverride(Base):
    __tablename__ = "member_permission_overrides"
    __table_args__ = (UniqueConstraint("company_member_id", "permission_id", name="uq_member_permission"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_member_id = uuid_fk("company_members")
    permission_id = uuid_fk("permissions")
    effect = Column(Enum(PermissionEffect), nullable=False)

    permission = relationship("Permission")


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    user_id = uuid_fk("users", nullable=True)
    name = Column(String(120), nullable=False)
    email = Column(String(160))
    phone = Column(String(30))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")


# ── Menus & packages ────────────────────────────────────────────────────
class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    category_id = uuid_fk("menu_categories", nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    image_url = Column(String(500))
    veg_type = Column(Enum(MenuVegType), nullable=False, default=MenuVegType.veg)
    dietary_tags = Column(ARRAY(String), default=list)
    allergens = Column(ARRAY(String), default=list)
    price = Column(Float, default=0)
    is_active = Column(Boolean, default=True)

    category = relationship("MenuCategory")


class Package(Base):
    __tablename__ = "packages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    name = Column(String(150), nullable=False)
    description = Column(Text)
    pricing_type = Column(Enum(PricingType), nullable=False, default=PricingType.per_guest)
    price = Column(Float, nullable=False)
    min_guests = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("PackageItem", back_populates="package", cascade="all, delete-orphan")


class PackageItem(Base):
    __tablename__ = "package_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    package_id = uuid_fk("packages")
    menu_item_id = uuid_fk("menu_items")
    note = Column(String(255))

    package = relationship("Package", back_populates="items")
    menu_item = relationship("MenuItem")


# ── Events (the central record) ─────────────────────────────────────────
class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    client_id = uuid_fk("clients")
    created_by = uuid_fk("users")
    title = Column(String(150), nullable=False)
    event_type = Column(String(100), nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    guest_count = Column(Integer, default=0)
    venue_name = Column(String(200))
    venue_address = Column(String(300))
    catering_requirement = Column(Enum(CateringRequirement), default=CateringRequirement.mixed)
    special_instructions = Column(Text)
    status = Column(Enum(EventStatus), nullable=False, default=EventStatus.enquiry)
    readiness_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    client = relationship("Client")
    company = relationship("Company")
    status_history = relationship(
        "EventStatusHistory", back_populates="event", cascade="all, delete-orphan",
        order_by="EventStatusHistory.created_at",
    )


class EventStatusHistory(Base):
    __tablename__ = "event_status_history"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events")
    from_status = Column(Enum(EventStatus), nullable=True)
    to_status = Column(Enum(EventStatus), nullable=False)
    changed_by = uuid_fk("users", nullable=True)
    note = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="status_history")


# ── Quotations ───────────────────────────────────────────────────────────
class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events")
    company_id = uuid_fk("companies")
    quote_number = Column(String(40), unique=True, nullable=False)
    status = Column(Enum(QuotationStatus), nullable=False, default=QuotationStatus.draft)
    subtotal = Column(Float, default=0)
    discount = Column(Float, default=0)
    tax_percent = Column(Float, default=0)
    service_charge = Column(Float, default=0)
    delivery_charge = Column(Float, default=0)
    advance_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    created_by = uuid_fk("users")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    quotation_id = uuid_fk("quotations")
    package_id = uuid_fk("packages", nullable=True)
    menu_item_id = uuid_fk("menu_items", nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0)
    line_total = Column(Float, default=0)

    quotation = relationship("Quotation", back_populates="items")


# ── Staff assignment, tasks, attendance ────────────────────────────────
class EventStaff(Base):
    __tablename__ = "event_staff"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events")
    company_member_id = uuid_fk("company_members")
    event_role = Column(Enum(EventStaffRole), nullable=False)
    shift_start = Column(DateTime(timezone=True), nullable=True)
    shift_end = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(AssignmentStatus), nullable=False, default=AssignmentStatus.pending)
    notes = Column(String(255))

    company_member = relationship("CompanyMember")
    event = relationship("Event")


class EventTask(Base):
    __tablename__ = "event_tasks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events")
    phase = Column(Enum(TaskPhase), nullable=False)
    title = Column(String(200), nullable=False)
    assigned_to = uuid_fk("company_members", nullable=True)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.todo)
    due_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text)
    photo_url = Column(String(500))


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_member_id = uuid_fk("company_members")
    event_id = uuid_fk("events", nullable=True)
    check_in = Column(DateTime(timezone=True), nullable=True)
    check_out = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.present)


# ── Invoices & payments ─────────────────────────────────────────────────
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events")
    company_id = uuid_fk("companies")
    invoice_number = Column(String(40), unique=True, nullable=False)
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.draft)
    subtotal = Column(Float, default=0)
    tax = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, default=0)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    event = relationship("Event")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    invoice_id = uuid_fk("invoices")
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    rate = Column(Float, default=0)
    amount = Column(Float, default=0)

    invoice = relationship("Invoice", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    invoice_id = uuid_fk("invoices", nullable=True)
    event_id = uuid_fk("events")
    company_id = uuid_fk("companies")
    amount = Column(Float, nullable=False)
    type = Column(Enum(PaymentType), nullable=False)
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.pending)
    provider = Column(String(50), nullable=True)
    provider_ref = Column(String(200), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Inventory ────────────────────────────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    name = Column(String(150), nullable=False)
    contact = Column(String(150))
    category = Column(String(100))
    notes = Column(Text)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    name = Column(String(150), nullable=False)
    category = Column(String(100))
    unit = Column(String(30), nullable=False)
    stock_qty = Column(Float, default=0)
    min_stock = Column(Float, default=0)
    supplier_id = uuid_fk("suppliers", nullable=True)


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    item_id = uuid_fk("inventory_items")
    event_id = uuid_fk("events", nullable=True)
    change_qty = Column(Float, nullable=False)
    type = Column(Enum(InventoryTxnType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Documents, messages, notifications, feedback ───────────────────────
class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    event_id = uuid_fk("events", nullable=True)
    type = Column(Enum(DocumentType), nullable=False)
    file_url = Column(String(500), nullable=False)
    uploaded_by = uuid_fk("users")
    visibility = Column(Enum(DocumentVisibility), nullable=False, default=DocumentVisibility.internal)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events")
    company_id = uuid_fk("companies")
    sender_id = uuid_fk("users")
    body = Column(Text, nullable=False)
    attachment_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    sender = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = uuid_fk("users")
    company_id = uuid_fk("companies", nullable=True)
    type = Column(String(60), nullable=False)
    title = Column(String(150), nullable=False)
    body = Column(String(500))
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(UUID(as_uuid=False), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = uuid_fk("events")
    overall_rating = Column(Integer, nullable=False)
    food_rating = Column(Integer)
    service_rating = Column(Integer)
    staff_rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Platform: audit logs, settings, subscriptions ──────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies", nullable=True)
    actor_user_id = uuid_fk("users", nullable=True)
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
    company_id = uuid_fk("companies")
    key = Column(String(80), nullable=False)
    value = Column(JSONB, nullable=False)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = uuid_fk("companies")
    plan = Column(String(50), nullable=False, default="free")
    status = Column(String(30), nullable=False, default="active")
    renewed_at = Column(DateTime(timezone=True), nullable=True)
