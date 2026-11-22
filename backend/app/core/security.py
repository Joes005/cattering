from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.models import Company, CompanyStatus, CustomerProfile, EmployeeProfile, User, UserRole, UserStatus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user: User, company_id: str | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)
    payload = {
        "sub": user.id,
        "role": user.role.value,
        "company_id": company_id,
        "status": user.status.value,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended or inactive")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_employer(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> tuple[User, Company]:
    if user.role != UserRole.employer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employer access required")

    company = db.query(Company).filter(Company.owner_id == user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No catering business associated with this employer account.",
        )
    if company.status == CompanyStatus.pending_approval:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your catering company registration is pending Admin review and approval.",
        )
    if company.status == CompanyStatus.rejected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your registration was rejected: {company.rejection_reason or 'Contact support'}.",
        )
    if company.status != CompanyStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your catering company account is not currently active.",
        )
    return user, company


def require_employee(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> tuple[User, EmployeeProfile]:
    if user.role != UserRole.employee:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee access required")

    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first()
    if not profile:
        profile = EmployeeProfile(user_id=user.id, location="Chennai, Tamil Nadu")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return user, profile


def require_customer(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> tuple[User, CustomerProfile]:
    if user.role != UserRole.customer and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required")

    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user.id).first()
    if not profile:
        profile = CustomerProfile(user_id=user.id, city="Chennai")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return user, profile


def ensure_company_scope(user: User, company_id_of_resource: str, company: Company | None, db: Session | None = None) -> None:
    """Guarantees strict tenant isolation across multiple catering businesses.
    Returns 404 to avoid tenant leaking.
    """
    if user.role == UserRole.admin:
        return
    if user.role != UserRole.employer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if company and company.id == company_id_of_resource and company.owner_id == user.id:
        return

    # Check if the employer owns this resource's company
    from app.db.database import SessionLocal
    local_db = db or SessionLocal()
    try:
        match = local_db.query(Company).filter(Company.id == company_id_of_resource, Company.owner_id == user.id).first()
        if match:
            if match.status == CompanyStatus.pending_approval:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your catering company registration is pending Admin review and approval.",
                )
            if match.status != CompanyStatus.approved:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your catering company account is not currently active.",
                )
            return
    finally:
        if not db:
            local_db.close()

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")


def require_permission(key: str = ""):
    """FastAPI dependency for company-scoped routes (/api/companies/{company_id}/...).
    Validates that the caller is an active approved Employer owning company_id or an Admin.
    """
    def dependency(
        company_id: str = Path(...),
        auth: tuple = Depends(require_employer),
    ) -> User:
        user, company = auth
        ensure_company_scope(user, company_id, company)
        return user
    return dependency


def get_accessible_event_or_404(db: Session, user: User, company_id: str, event_id: str):
    from app.models.models import Event
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.company_id == company_id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event

