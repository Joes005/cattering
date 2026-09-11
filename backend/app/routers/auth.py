from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.permissions import CLIENT_PERMISSIONS, PERMISSION_KEYS
from app.core.security import (
    create_access_token,
    effective_permissions,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.utils import slugify
from app.db.database import get_db
from app.models.models import Company, CompanyMember, EmploymentRole, GlobalRole, MemberStatus, User, UserStatus
from app.schemas.schemas import ClientSignup, CompanyCreate, CompanyMembershipOut, TokenOut, UserLogin, UserOut, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _build_token_out(db: Session, user: User) -> TokenOut:
    memberships: list[CompanyMembershipOut] = []
    fixed_permissions: list[str] = []
    if user.global_role == GlobalRole.admin:
        fixed_permissions = sorted(PERMISSION_KEYS)
    elif user.global_role == GlobalRole.client:
        fixed_permissions = sorted(CLIENT_PERMISSIONS)
    elif user.global_role == GlobalRole.company_user:
        rows = (
            db.query(CompanyMember, Company)
            .join(Company, Company.id == CompanyMember.company_id)
            .filter(CompanyMember.user_id == user.id, CompanyMember.status == MemberStatus.active)
            .all()
        )
        for member, company in rows:
            memberships.append(
                CompanyMembershipOut(
                    company_id=company.id,
                    company_name=company.name,
                    employment_role=member.employment_role,
                    permissions=sorted(effective_permissions(db, user, company.id)),
                )
            )
    token = create_access_token(user)
    return TokenOut(
        token=token, user=UserOut.model_validate(user), memberships=memberships, permissions=fixed_permissions
    )


@router.post("/signup", response_model=TokenOut)
def signup(payload: ClientSignup, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        global_role=GlobalRole.client,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_token_out(db, user)


@router.post("/company-signup", response_model=TokenOut)
def company_signup(payload: CompanyCreate, db: Session = Depends(get_db)):
    """Public self-serve registration for a new catering company — creates the
    company and logs its owner straight in, no admin approval needed."""
    if db.query(User).filter(User.email == payload.owner_email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    company = Company(
        name=payload.name, slug=slugify(payload.name), gst_number=payload.gst_number, currency=payload.currency
    )
    db.add(company)
    db.flush()

    owner = User(
        full_name=payload.owner_name,
        email=payload.owner_email,
        password_hash=hash_password(payload.owner_password),
        global_role=GlobalRole.company_user,
    )
    db.add(owner)
    db.flush()

    db.add(CompanyMember(company_id=company.id, user_id=owner.id, employment_role=EmploymentRole.owner, job_title="Owner"))
    log_action(
        db, owner.id, "company_created", "company", company.id, company_id=company.id,
        new_value={"name": company.name, "source": "self_signup"},
    )
    db.commit()
    db.refresh(owner)
    return _build_token_out(db, owner)


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            log_action(db, user.id, "login_failed", "user", user.id)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been suspended")

    log_action(db, user.id, "login", "user", user.id)
    db.commit()
    return _build_token_out(db, user)


@router.get("/me", response_model=TokenOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _build_token_out(db, current_user)


@router.put("/profile", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        current_user.password_hash = hash_password(payload.new_password)

    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    db.commit()
    db.refresh(current_user)
    return current_user
