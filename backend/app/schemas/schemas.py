from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.models import (
    ApplicationStatus,
    AssignmentStatus,
    AttendanceStatus,
    CateringRequirement,
    CommissionCalculationMode,
    CommissionType,
    CompanyStatus,
    DisputeParty,
    DisputeStatus,
    DocumentType,
    DocumentVisibility,
    EventStatus,
    InventoryTxnType,
    InvoiceStatus,
    JobPostingStatus,
    MenuVegType,
    PaymentStatus,
    PaymentType,
    PayoutStatus,
    PricingType,
    QuotationStatus,
    SubscriptionBillingCycle,
    SubscriptionStatus,
    TaskPhase,
    TaskStatus,
    TransactionStatus,
    TransactionType,
    UserRole,
    UserStatus,
)


# ── Domain 1: Identity & Authentication ───────────────────────────────────
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class EmployerRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str
    business_name: str
    business_type: str = "Catering Service"
    business_address: str
    gst_number: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


class EmployeeRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    location: str = "Chennai, Tamil Nadu"
    skills: list[str] = []
    work_experience_years: float = 0.0
    preferred_work_type: str = "flexible"
    bio: Optional[str] = None


class CustomerRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str
    city: str = "Chennai"
    default_address: Optional[str] = None
    preferred_cuisine: list[str] = []


class CustomerProfileOut(BaseModel):
    id: str
    user_id: str
    city: str = "Chennai"
    default_address: Optional[str] = None
    default_delivery_address: Optional[str] = None
    preferred_cuisine: list[str] = []
    preferred_cuisines: list[str] = []
    notes: Optional[str] = None
    created_at: datetime
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    user: Optional["UserOut"] = None

    @model_validator(mode="before")
    @classmethod
    def populate_user_fields(cls, data):
        if hasattr(data, "user") and data.user:
            data.__dict__["email"] = getattr(data.user, "email", None)
            data.__dict__["full_name"] = getattr(data.user, "full_name", None)
            data.__dict__["phone"] = getattr(data.user, "phone", None)
            data.__dict__["default_delivery_address"] = getattr(data, "default_address", None)
            data.__dict__["preferred_cuisines"] = getattr(data, "preferred_cuisine", []) or []
        elif isinstance(data, dict):
            u = data.get("user")
            if isinstance(u, dict):
                data["email"] = u.get("email")
                data["full_name"] = u.get("full_name")
                data["phone"] = u.get("phone")
            data["default_delivery_address"] = data.get("default_delivery_address") or data.get("default_address")
            data["preferred_cuisines"] = data.get("preferred_cuisines") or data.get("preferred_cuisine") or []
        return data

    class Config:
        from_attributes = True


class CustomerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    default_address: Optional[str] = None
    default_delivery_address: Optional[str] = None
    preferred_cuisine: Optional[list[str]] = None
    preferred_cuisines: Optional[list[str]] = None
    notes: Optional[str] = None


class UserOut(BaseModel):
    id: str
    role: UserRole
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeProfileOut(BaseModel):
    id: str
    user_id: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    location: str
    skills: list[str] = []
    work_experience_years: float
    preferred_work_type: str
    availability_status: str
    preferred_days: list[str] = []
    bio: Optional[str] = None
    rating: float
    total_completed_events: int
    created_at: datetime
    hourly_rate: Optional[float] = 150.0
    is_available: Optional[bool] = True
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


class EmployeeProfileUpdate(BaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[list[str]] = None
    work_experience_years: Optional[float] = None
    preferred_work_type: Optional[str] = None
    availability_status: Optional[str] = None
    preferred_days: Optional[list[str]] = None
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None
    is_available: Optional[bool] = None


class CompanyOut(BaseModel):
    id: str
    owner_id: str
    name: str
    slug: str
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    gst_number: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    currency: str = "INR"
    status: CompanyStatus
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyPublicOut(BaseModel):
    id: str
    name: str
    slug: str
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyCreate(BaseModel):
    name: str
    business_type: str = "Catering Service"
    business_address: str
    gst_number: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    currency: str = "INR"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    gst_number: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


class EmployerSubscribe(BaseModel):
    plan_code: str
    billing_cycle: SubscriptionBillingCycle = SubscriptionBillingCycle.monthly
    payment_reference: Optional[str] = None


class EmployerSubscriptionStatusOut(BaseModel):
    has_active_subscription: bool
    status: Optional[SubscriptionStatus] = None
    plan: Optional[Any] = None
    current_period_end: Optional[datetime] = None
    events_used_this_month: int = 0
    max_events_limit: int = 5
    customers_count: int = 0
    max_customers_limit: int = 50
    job_postings_count: int = 0
    max_job_postings_limit: int = 10
    custom_branding: bool = False


class TokenOut(BaseModel):
    token: str
    role: UserRole
    user: UserOut
    company: Optional[CompanyOut] = None
    companies: Optional[list[CompanyOut]] = None
    employee_profile: Optional[EmployeeProfileOut] = None
    customer_profile: Optional[CustomerProfileOut] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=6)


# ── Domain 2: Admin Operations ────────────────────────────────────────────
class AdminEmployerApproval(BaseModel):
    status: CompanyStatus  # 'approved' or 'rejected' or 'suspended'
    rejection_reason: Optional[str] = None


class AdminUserStatusUpdate(BaseModel):
    status: UserStatus  # 'active' or 'suspended'


class AdminStatsOut(BaseModel):
    total_employers: int
    pending_employers: int
    approved_employers: int
    total_employees: int
    total_events: int
    total_revenue: float
    open_jobs: int
    total_subscriptions: int = 0
    active_subscriptions: int = 0
    total_commissions: float = 0.0
    open_disputes: int = 0


# ── Domain 3: Customer Management ─────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerOut(BaseModel):
    id: str
    company_id: str
    name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Domain 4: Event Management ────────────────────────────────────────────
class EventCreate(BaseModel):
    customer_id: str
    title: str
    event_type: str
    event_date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    guest_count: int = Field(ge=1)
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    catering_requirement: CateringRequirement = CateringRequirement.mixed
    special_instructions: Optional[str] = None


class EventUpdate(BaseModel):
    customer_id: Optional[str] = None
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
    changed_by: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventOut(BaseModel):
    id: str
    company_id: str
    customer_id: str
    created_by: str
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
    customer: Optional[CustomerOut] = None
    company: Optional[CompanyOut] = None

    class Config:
        from_attributes = True


EventDetailOut = EventOut


class EventTaskCreate(BaseModel):
    phase: TaskPhase
    title: str
    assigned_to_user_id: Optional[str] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class EventTaskUpdate(BaseModel):
    phase: Optional[TaskPhase] = None
    title: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    status: Optional[TaskStatus] = None
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None


class EventTaskOut(BaseModel):
    id: str
    event_id: str
    phase: TaskPhase
    title: str
    assigned_to_user_id: Optional[str] = None
    status: TaskStatus
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── Domain 5: Workforce Marketplace ──────────────────────────────────────
class JobPostingCreate(BaseModel):
    event_id: str
    role_title: str
    description: Optional[str] = None
    required_count: int = Field(ge=1, default=1)
    shift_start: datetime
    shift_end: datetime
    pay_rate: float = Field(ge=0.0)
    pay_type: str = "fixed_shift"
    location: str


class JobPostingUpdate(BaseModel):
    role_title: Optional[str] = None
    description: Optional[str] = None
    required_count: Optional[int] = Field(default=None, ge=1)
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None
    pay_rate: Optional[float] = None
    pay_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[JobPostingStatus] = None


class JobPostingOut(BaseModel):
    id: str
    company_id: str
    event_id: str
    role_title: str
    description: Optional[str] = None
    required_count: int
    filled_count: int
    shift_start: datetime
    shift_end: datetime
    pay_rate: float
    pay_type: str
    location: str
    status: JobPostingStatus
    created_at: datetime
    company: Optional[CompanyOut] = None

    class Config:
        from_attributes = True


class JobApplicationCreate(BaseModel):
    job_posting_id: Optional[str] = None
    cover_note: Optional[str] = None



class JobApplicationReview(BaseModel):
    status: ApplicationStatus  # 'accepted' or 'rejected'
    employer_notes: Optional[str] = None


class JobApplicationOut(BaseModel):
    id: str
    job_posting_id: str
    employee_id: str
    cover_note: Optional[str] = None
    status: ApplicationStatus
    employer_notes: Optional[str] = None
    applied_at: datetime
    reviewed_at: Optional[datetime] = None
    job_posting: Optional[JobPostingOut] = None
    employee: Optional[EmployeeProfileOut] = None

    class Config:
        from_attributes = True


class EmployeeAssignmentCreate(BaseModel):
    event_id: str
    job_posting_id: Optional[str] = None
    employee_id: str
    event_role: str
    shift_start: datetime
    shift_end: datetime
    agreed_pay: float
    notes: Optional[str] = None


class EmployeeAssignmentOut(BaseModel):
    id: str
    company_id: str
    event_id: str
    job_posting_id: Optional[str] = None
    employee_id: str
    event_role: str
    role: Optional[str] = None
    shift_start: datetime
    shift_end: datetime
    agreed_pay: float
    agreed_pay_rate: Optional[float] = None
    status: AssignmentStatus
    notes: Optional[str] = None
    created_at: datetime
    company: Optional[CompanyOut] = None
    employee: Optional[EmployeeProfileOut] = None
    event: Optional[EventOut] = None
    attendance: Optional['AttendanceOut'] = None

    class Config:
        from_attributes = True


class AttendanceCheckInOut(BaseModel):
    assignment_id: str
    action: str  # 'check_in' or 'check_out'
    notes: Optional[str] = None


class AttendanceVerify(BaseModel):
    hours_worked: float
    status: AttendanceStatus = AttendanceStatus.present
    verified_by_employer: bool = True
    notes: Optional[str] = None


class AttendanceOut(BaseModel):
    id: str
    assignment_id: str
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    hours_worked: float
    status: AttendanceStatus
    verified_by_employer: bool
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeeEarningOut(BaseModel):
    id: str
    assignment_id: str
    employee_id: str
    company_id: str
    amount: float
    total_amount: Optional[float] = None
    status: PayoutStatus
    payment_reference: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    company: Optional[CompanyOut] = None
    event_title: Optional[str] = None
    hours_worked: Optional[float] = 0.0
    hourly_rate: Optional[float] = 0.0

    class Config:
        from_attributes = True


class EmployeeEarningsSummaryOut(BaseModel):
    total_earnings: float = 0.0
    paid_out: float = 0.0
    pending_payout: float = 0.0
    completed_shifts_count: int = 0
    payouts: list[EmployeeEarningOut] = []


class PayoutUpdate(BaseModel):
    status: PayoutStatus
    payment_reference: Optional[str] = None


# ── Domain 6: Menus & Packages ───────────────────────────────────────────
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
    name: str
    category_id: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    veg_type: MenuVegType = MenuVegType.veg
    dietary_tags: list[str] = []
    allergens: list[str] = []
    price: float = 0.0
    unit_price: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def populate_price(cls, data):
        if isinstance(data, dict):
            if ("price" not in data or data["price"] is None or data["price"] == 0.0) and "unit_price" in data:
                data["price"] = data["unit_price"]
        return data


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    veg_type: Optional[MenuVegType] = None
    dietary_tags: Optional[list[str]] = None
    allergens: Optional[list[str]] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None


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
    category: Optional[MenuCategoryOut] = None

    class Config:
        from_attributes = True


class PackageItemCreate(BaseModel):
    menu_item_id: str
    note: Optional[str] = None


class PackageItemOut(BaseModel):
    id: str
    package_id: str
    menu_item_id: str
    note: Optional[str] = None
    menu_item: Optional[MenuItemOut] = None

    class Config:
        from_attributes = True


class PackageItemCreate(BaseModel):
    menu_item_id: str
    note: Optional[str] = None


class PackageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pricing_type: PricingType = PricingType.per_guest
    price: Optional[float] = None
    base_price: Optional[float] = None
    min_guests: int = 0
    is_active: bool = True
    items: list[PackageItemCreate] = []
    item_ids: list[str] = []

    @model_validator(mode="before")
    @classmethod
    def populate_package(cls, data):
        if isinstance(data, dict):
            if ("price" not in data or data["price"] is None) and "base_price" in data:
                data["price"] = data["base_price"]
            if "items" not in data:
                data["items"] = []
            if "item_ids" in data and not data["items"]:
                data["items"] = [{"menu_item_id": i} for i in data["item_ids"]]
        return data


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pricing_type: Optional[PricingType] = None
    price: Optional[float] = None
    min_guests: Optional[int] = None
    is_active: Optional[bool] = None
    item_ids: Optional[list[str]] = None


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
    items: list[PackageItemOut] = []

    class Config:
        from_attributes = True


PackageDetailOut = PackageOut


# ── Domain 7: Financial Management ───────────────────────────────────────
class QuotationItemCreate(BaseModel):
    package_id: Optional[str] = None
    menu_item_id: Optional[str] = None
    description: Optional[str] = None
    item_name: Optional[str] = None
    quantity: int = 1
    unit_price: float

    @model_validator(mode="before")
    @classmethod
    def populate_desc(cls, data):
        if isinstance(data, dict):
            if "description" not in data or not data["description"]:
                data["description"] = data.get("item_name") or "Quotation item"
        return data


class QuotationItemOut(BaseModel):
    id: str
    quotation_id: str
    package_id: Optional[str] = None
    menu_item_id: Optional[str] = None
    description: str
    quantity: int
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True


class QuotationCreate(BaseModel):
    event_id: Optional[str] = None
    discount: float = 0.0
    tax_percent: float = 5.0
    tax_rate: Optional[float] = None
    service_charge: float = 0.0
    delivery_charge: float = 0.0
    advance_amount: float = 0.0
    valid_until: Optional[datetime] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    items: list[QuotationItemCreate] = []

    @model_validator(mode="before")
    @classmethod
    def populate_tax(cls, data):
        if isinstance(data, dict):
            if "tax_rate" in data and ("tax_percent" not in data or data["tax_percent"] == 5.0):
                data["tax_percent"] = data["tax_rate"]
        return data


class QuotationUpdate(BaseModel):
    discount: Optional[float] = None
    tax_percent: Optional[float] = None
    service_charge: Optional[float] = None
    delivery_charge: Optional[float] = None
    advance_amount: Optional[float] = None
    valid_until: Optional[datetime] = None
    status: Optional[QuotationStatus] = None
    items: Optional[list[QuotationItemCreate]] = None


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
    items: list[QuotationItemOut] = []

    class Config:
        from_attributes = True


QuotationDetailOut = QuotationOut


class InvoiceItemCreate(BaseModel):
    description: Optional[str] = None
    item_name: Optional[str] = None
    quantity: int = 1
    rate: Optional[float] = None
    unit_price: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def populate_item(cls, data):
        if isinstance(data, dict):
            if "description" not in data or not data["description"]:
                data["description"] = data.get("item_name") or "Invoice item"
            if "rate" not in data or data["rate"] is None:
                data["rate"] = data.get("unit_price") or 0.0
        return data


class InvoiceItemOut(BaseModel):
    id: str
    invoice_id: str
    description: str
    quantity: int
    rate: float
    amount: float

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    event_id: Optional[str] = None
    invoice_number: Optional[str] = None
    subtotal: Optional[float] = 0.0
    tax: float = 0.0
    discount: float = 0.0
    total: Optional[float] = None
    total_amount: Optional[float] = None
    due_date: Optional[Any] = None
    notes: Optional[str] = None
    items: list[InvoiceItemCreate] = []

    @model_validator(mode="before")
    @classmethod
    def populate_total(cls, data):
        if isinstance(data, dict):
            if ("total" not in data or data["total"] is None) and "total_amount" in data and data["total_amount"] is not None:
                data["total"] = data["total_amount"]
            if ("subtotal" not in data or data["subtotal"] is None):
                data["subtotal"] = data.get("total", 0.0)
            if "total" not in data or data["total"] is None:
                data["total"] = data.get("subtotal", 0.0)
        return data


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    due_date: Optional[date] = None


class PaymentCreate(BaseModel):
    invoice_id: Optional[str] = None
    amount: float
    type: PaymentType = PaymentType.advance
    status: PaymentStatus = PaymentStatus.paid
    provider: Optional[str] = "manual"
    provider_ref: Optional[str] = None


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
    total_amount: Optional[float] = None
    amount_paid: Optional[float] = 0.0
    balance_due: Optional[float] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    items: list[InvoiceItemOut] = []
    payments: list[PaymentOut] = []

    @model_validator(mode="before")
    @classmethod
    def populate_amounts(cls, data):
        if hasattr(data, "total"):
            payments_list = getattr(data, "payments", []) or []
            paid = sum(
                float(getattr(p, "amount", 0.0))
                for p in payments_list
                if str(getattr(p, "status", "")).lower().endswith("paid")
            )
            data.__dict__["total_amount"] = float(getattr(data, "total", 0.0))
            data.__dict__["amount_paid"] = round(paid, 2)
            data.__dict__["balance_due"] = max(0.0, float(getattr(data, "total", 0.0)) - round(paid, 2))
        elif isinstance(data, dict):
            if "total_amount" not in data and "total" in data:
                data["total_amount"] = data["total"]
            if "amount_paid" not in data:
                payments_list = data.get("payments", []) or []
                paid = sum(
                    float(p.get("amount", 0.0) if isinstance(p, dict) else getattr(p, "amount", 0.0))
                    for p in payments_list
                    if str(p.get("status") if isinstance(p, dict) else getattr(p, "status", "")).lower().endswith("paid")
                )
                data["amount_paid"] = round(paid, 2)
                data["balance_due"] = max(0.0, float(data.get("total", 0.0)) - round(paid, 2))
        return data

    class Config:
        from_attributes = True


InvoiceDetailOut = InvoiceOut


# ── Domain 8: Inventory & Operations ─────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None


class SupplierOut(BaseModel):
    id: str
    company_id: str
    name: str
    contact: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str
    stock_qty: float = 0.0
    min_stock: float = 0.0
    supplier_id: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock_qty: Optional[float] = None
    min_stock: Optional[float] = None
    supplier_id: Optional[str] = None


class InventoryItemOut(BaseModel):
    id: str
    company_id: str
    name: str
    category: Optional[str] = None
    unit: str
    stock_qty: float
    min_stock: float
    supplier_id: Optional[str] = None
    is_low_stock: bool = False

    class Config:
        from_attributes = True


class InventoryTxnCreate(BaseModel):
    item_id: str
    event_id: Optional[str] = None
    change_qty: float
    type: InventoryTxnType


class InventoryTxnOut(BaseModel):
    id: str
    item_id: str
    event_id: Optional[str] = None
    change_qty: float
    type: InventoryTxnType
    created_at: datetime

    class Config:
        from_attributes = True


InventoryTransactionCreate = InventoryTxnCreate
InventoryTransactionOut = InventoryTxnOut



# ── Domain 9: Documents, Messages, Notifications, Logs ───────────────────
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


class MessageCreate(BaseModel):
    body: str
    attachment_url: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    event_id: str
    company_id: str
    sender_id: str
    body: str
    attachment_url: Optional[str] = None
    created_at: datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    body: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerEventInquiryCreate(BaseModel):
    company_id: str
    title: str
    event_type: str = "Wedding"
    event_date: datetime
    guest_count: int = 100
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    catering_requirement: CateringRequirement = CateringRequirement.mixed
    dietary_notes: Optional[str] = None
    budget: Optional[float] = None
    notes: Optional[str] = None
    special_instructions: Optional[str] = None


class CustomerPaymentCreate(BaseModel):
    amount: float
    payment_method: Optional[str] = "card"
    provider: Optional[str] = "manual"
    provider_ref: Optional[str] = None
    reference_note: Optional[str] = None
    notes: Optional[str] = None


class CustomerFeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    feedback: Optional[str] = None


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
    status: str = "feedback_received"
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    id: str
    company_id: Optional[str] = None
    actor_user_id: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


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


# ── Domain 10: SaaS Subscriptions ─────────────────────────────────────────
class SubscriptionPlanCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    monthly_price: float = 0.0
    annual_price: float = 0.0
    max_active_events_per_month: int = 5
    max_customers: int = 50
    max_job_postings_per_month: int = 10
    custom_branding: bool = False
    analytics_tier: str = "basic"
    is_active: bool = True


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = None
    annual_price: Optional[float] = None
    max_active_events_per_month: Optional[int] = None
    max_customers: Optional[int] = None
    max_job_postings_per_month: Optional[int] = None
    custom_branding: Optional[bool] = None
    analytics_tier: Optional[str] = None
    is_active: Optional[bool] = None


class SubscriptionPlanOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    monthly_price: float
    annual_price: float
    max_active_events_per_month: int
    max_customers: int
    max_job_postings_per_month: int
    custom_branding: bool
    analytics_tier: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionOut(BaseModel):
    id: str
    company_id: str
    company_name: Optional[str] = None
    plan_id: str
    plan: Optional[SubscriptionPlanOut] = None
    billing_cycle: SubscriptionBillingCycle
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None
    cancel_at_period_end: bool
    payment_reference: Optional[str] = None
    auto_renew: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionOverride(BaseModel):
    company_id: str
    plan_id: str
    billing_cycle: SubscriptionBillingCycle = SubscriptionBillingCycle.monthly
    status: SubscriptionStatus = SubscriptionStatus.active
    duration_days: int = 30
    payment_reference: Optional[str] = "ADMIN_OVERRIDE"


# ── Domain 11: Marketplace Commissions ───────────────────────────────────
class CommissionRuleCreate(BaseModel):
    commission_type: CommissionType
    name: str
    calculation_mode: CommissionCalculationMode = CommissionCalculationMode.percentage
    rate: float = 5.0
    flat_fee: float = 0.0
    company_id: Optional[str] = None
    is_active: bool = True


class CommissionRuleUpdate(BaseModel):
    name: Optional[str] = None
    rate: Optional[float] = None
    flat_fee: Optional[float] = None
    is_active: Optional[bool] = None


class CommissionRuleOut(BaseModel):
    id: str
    commission_type: CommissionType
    name: str
    calculation_mode: CommissionCalculationMode
    rate: float
    flat_fee: float
    company_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CommissionLedgerOut(BaseModel):
    id: str
    rule_id: Optional[str] = None
    commission_type: CommissionType
    event_id: Optional[str] = None
    assignment_id: Optional[str] = None
    company_id: str
    company_name: Optional[str] = None
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    gross_amount: float
    commission_rate: float
    commission_amount: float
    net_payout: float
    is_settled: bool
    settled_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Domain 12: Financial Transactions ────────────────────────────────────
class TransactionOut(BaseModel):
    id: str
    transaction_number: str
    transaction_type: TransactionType
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    event_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    gateway_provider: str
    gateway_reference: Optional[str] = None
    status: TransactionStatus
    payment_method: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Domain 13: Disputes ──────────────────────────────────────────────────
class DisputeCreate(BaseModel):
    party_type: DisputeParty
    company_id: Optional[str] = None
    event_id: Optional[str] = None
    assignment_id: Optional[str] = None
    title: str
    description: str
    claim_amount: float = 0.0


class DisputeMessageCreate(BaseModel):
    message: str
    attachment_url: Optional[str] = None


class DisputeMessageOut(BaseModel):
    id: str
    dispute_id: str
    sender_user_id: str
    sender_name: Optional[str] = None
    message: str
    attachment_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DisputeOut(BaseModel):
    id: str
    dispute_number: str
    party_type: DisputeParty
    opened_by_user_id: str
    opened_by_name: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    event_id: Optional[str] = None
    assignment_id: Optional[str] = None
    title: str
    description: str
    claim_amount: float
    status: DisputeStatus
    resolution_summary: Optional[str] = None
    arbitrated_by: Optional[str] = None
    arbitrated_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    messages: list[DisputeMessageOut] = []

    class Config:
        from_attributes = True


class DisputeResolve(BaseModel):
    status: DisputeStatus = DisputeStatus.resolved
    resolution_summary: str


# ── Domain 14: Platform Settings ─────────────────────────────────────────
class PlatformSettingOut(BaseModel):
    id: str
    key: str
    value: Any
    description: Optional[str] = None
    category: str
    updated_at: datetime

    class Config:
        from_attributes = True


class PlatformSettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None


# ── Customer Profiles & Charts ───────────────────────────────────────────
class AdminChartPoint(BaseModel):
    name: str
    value: float
    secondary_value: Optional[float] = None

