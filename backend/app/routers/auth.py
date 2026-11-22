from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.utils import slugify
from app.db.database import get_db
from app.models.models import Company, CompanyStatus, CustomerProfile, EmployeeProfile, User, UserRole, UserStatus
from app.schemas.schemas import (
    AdminLogin,
    CompanyOut,
    CustomerProfileOut,
    CustomerRegister,
    EmployeeProfileOut,
    EmployeeRegister,
    EmployerRegister,
    TokenOut,
    UserLogin,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _build_token_response(db: Session, user: User) -> TokenOut:
    company_out = None
    companies_out = None
    employee_profile_out = None
    customer_profile_out = None
    company_id = None

    if user.role == UserRole.employer:
        companies = db.query(Company).filter(Company.owner_id == user.id).order_by(Company.created_at.asc()).all()
        if companies:
            companies_out = [
                CompanyOut(
                    id=c.id,
                    owner_id=c.owner_id,
                    name=c.name,
                    slug=c.slug,
                    business_type=c.business_type,
                    business_address=c.business_address,
                    gst_number=c.gst_number,
                    description=c.description,
                    logo_url=c.logo_url,
                    currency=c.currency or "INR",
                    status=c.status,
                    rejection_reason=c.rejection_reason,
                    approved_at=c.approved_at,
                    created_at=c.created_at,
                    owner_name=user.full_name,
                    owner_email=user.email,
                    owner_phone=user.phone,
                    address=c.business_address,
                )
                for c in companies
            ]
            company_out = companies_out[0]
            company_id = company_out.id

    elif user.role == UserRole.employee:
        profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first()
        if profile:
            employee_profile_out = EmployeeProfileOut.model_validate(profile)

    elif user.role == UserRole.customer:
        c_prof = db.query(CustomerProfile).filter(CustomerProfile.user_id == user.id).first()
        if c_prof:
            customer_profile_out = CustomerProfileOut.model_validate(c_prof)

    token = create_access_token(user, company_id=company_id)
    return TokenOut(
        token=token,
        role=user.role,
        user=UserOut.model_validate(user),
        company=company_out,
        companies=companies_out,
        employee_profile=employee_profile_out,
        customer_profile=customer_profile_out,
    )


# ── Dedicated Admin Login ─────────────────────────────────────────────────
@router.post("/admin/login", response_model=TokenOut)
def admin_login(payload: AdminLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Admin account required.")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin account is inactive")

    log_action(db, user.id, "admin_login", "user", user.id)
    return _build_token_response(db, user)


# ── Employer Registration & Login ─────────────────────────────────────────
@router.post("/employer/register", response_model=TokenOut)
def employer_register(payload: EmployerRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    # 1. Create employer user
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        role=UserRole.employer,
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()

    # 2. Create company in pending_approval status
    base_slug = slugify(payload.business_name)
    slug = base_slug
    counter = 1
    while db.query(Company).filter(Company.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    company = Company(
        owner_id=user.id,
        name=payload.business_name,
        slug=slug,
        business_type=payload.business_type,
        business_address=payload.business_address,
        gst_number=payload.gst_number,
        description=payload.description,
        logo_url=payload.logo_url,
        status=CompanyStatus.pending_approval,
    )
    db.add(company)
    db.flush()

    log_action(
        db,
        user.id,
        "employer_registered",
        "company",
        company.id,
        company_id=company.id,
        new_value={"business_name": company.name, "status": "pending_approval"},
    )
    db.commit()
    db.refresh(user)
    return _build_token_response(db, user)


@router.post("/employer/login", response_model=TokenOut)
def employer_login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.role != UserRole.employer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This login is exclusively for employers.")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employer account is suspended.")

    log_action(db, user.id, "employer_login", "user", user.id)
    return _build_token_response(db, user)


# ── Employee Registration & Login ─────────────────────────────────────────
@router.post("/employee/register", response_model=TokenOut)
def employee_register(payload: EmployeeRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        role=UserRole.employee,
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()

    profile = EmployeeProfile(
        user_id=user.id,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        location=payload.location,
        skills=payload.skills or ["Server", "Hospitality"],
        work_experience_years=payload.work_experience_years,
        preferred_work_type=payload.preferred_work_type,
        bio=payload.bio,
    )
    db.add(profile)
    log_action(db, user.id, "employee_registered", "employee_profile", profile.id)
    db.commit()
    db.refresh(user)
    return _build_token_response(db, user)


@router.post("/employee/login", response_model=TokenOut)
def employee_login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.role != UserRole.employee:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This login is exclusively for employees.")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee account is suspended.")

    log_action(db, user.id, "employee_login", "user", user.id)
    return _build_token_response(db, user)


# ── Dedicated Customer Registration & Login ───────────────────────────────
@router.post("/customer/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register_customer(payload: CustomerRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=UserRole.customer,
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()

    customer_prof = CustomerProfile(
        user_id=user.id,
        city=payload.city,
        default_address=payload.default_address,
        preferred_cuisine=payload.preferred_cuisine,
    )
    db.add(customer_prof)
    log_action(db, user.id, "customer_registered", "user", user.id)
    db.commit()
    db.refresh(user)

    return _build_token_response(db, user)


@router.post("/customer/login", response_model=TokenOut)
def login_customer(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.role != UserRole.customer and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This login is exclusively for catering customers.")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer account is suspended.")

    log_action(db, user.id, "customer_login", "user", user.id)
    return _build_token_response(db, user)


# ── Unified / Backward Compatible Login ────────────────────────────────────
@router.post("/login", response_model=TokenOut)
def unified_login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended.")

    log_action(db, user.id, "user_login", "user", user.id)
    return _build_token_response(db, user)


# ── Current User Profile ──────────────────────────────────────────────────
@router.get("/me", response_model=TokenOut)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _build_token_response(db, user)


@router.patch("/profile", response_model=UserOut)
def update_profile(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
