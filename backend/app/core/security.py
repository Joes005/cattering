from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import CLIENT_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PERMISSION_KEYS
from app.db.database import get_db
from app.models.models import (
    CompanyMember,
    GlobalRole,
    MemberPermissionOverride,
    MemberStatus,
    PermissionEffect,
    User,
    UserStatus,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)
    payload = {"sub": user.id, "role": user.global_role.value, "exp": expire}
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

    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or suspended")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.global_role != GlobalRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_client(user: User = Depends(get_current_user)) -> User:
    if user.global_role != GlobalRole.client:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client access required")
    return user


# ── RBAC core ────────────────────────────────────────────────────────────
# Every company-owned resource must be authorized through the two helpers
# below (get_membership + effective_permissions / check_permission, plus
# ensure_company_scope or ensure_client_owns). This is the one place that
# implements "user + role + permission + tenant + resource ownership" so
# routers never re-implement authorization ad hoc.

def get_membership(db: Session, user: User, company_id: str) -> CompanyMember | None:
    if user.global_role != GlobalRole.company_user:
        return None
    return (
        db.query(CompanyMember)
        .filter(
            CompanyMember.user_id == user.id,
            CompanyMember.company_id == company_id,
            CompanyMember.status == MemberStatus.active,
        )
        .first()
    )


def effective_permissions(db: Session, user: User, company_id: str | None = None) -> set[str]:
    if user.global_role == GlobalRole.admin:
        return set(PERMISSION_KEYS)
    if user.global_role == GlobalRole.client:
        return set(CLIENT_PERMISSIONS)

    if not company_id:
        return set()
    member = get_membership(db, user, company_id)
    if not member:
        return set()

    granted = set(DEFAULT_ROLE_PERMISSIONS.get(member.employment_role, set()))
    overrides = db.query(MemberPermissionOverride).filter(
        MemberPermissionOverride.company_member_id == member.id
    )
    for override in overrides.all():
        key = override.permission.key
        if override.effect == PermissionEffect.grant:
            granted.add(key)
        else:
            granted.discard(key)
    return granted


def check_permission(db: Session, user: User, company_id: str | None, key: str) -> None:
    if key not in effective_permissions(db, user, company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to perform '{key}'.",
        )


def require_permission(key: str):
    """FastAPI dependency for routes shaped as /companies/{company_id}/... """

    def dependency(
        company_id: str = Path(...),
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        check_permission(db, user, company_id, key)
        return user

    return dependency


def ensure_company_scope(user: User, company_id_of_resource: str, member: CompanyMember | None) -> None:
    """404s (not 403) when a company_user's resource belongs to another tenant."""
    if user.global_role == GlobalRole.admin:
        return
    if user.global_role != GlobalRole.company_user or not member or member.company_id != company_id_of_resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def ensure_client_owns(db: Session, user: User, client_id: str) -> None:
    from app.models.models import Client

    if user.global_role == GlobalRole.admin:
        return
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client or client.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


# ── Event-level scoping ──────────────────────────────────────────────────
# Per spec: "Employee should only see events they are assigned to unless
# they have additional permissions" — owner/manager (and admin) see every
# event in the company; a plain `staff` member only sees events they're
# assigned to via EventStaff. This is enforced here once and reused by
# every router that hangs off /companies/{company_id}/events/{event_id}/...
# (events, quotations, staff assignment, tasks, attendance) instead of each
# reimplementing the same scoping check.

def _staff_member_or_none(db: Session, user: User, company_id: str) -> CompanyMember | None:
    from app.models.models import EmploymentRole

    member = get_membership(db, user, company_id)
    if member and member.employment_role == EmploymentRole.staff:
        return member
    return None


def scope_event_ids_for_staff(db: Session, user: User, company_id: str) -> list[str] | None:
    """None means "no extra scoping" (owner/manager/admin); otherwise the list
    of event ids a staff member is allowed to see (possibly empty)."""
    from app.models.models import EventStaff

    member = _staff_member_or_none(db, user, company_id)
    if not member:
        return None
    rows = db.query(EventStaff.event_id).filter(EventStaff.company_member_id == member.id).all()
    return [r[0] for r in rows]


def get_accessible_event_or_404(db: Session, user: User, company_id: str, event_id: str):
    from app.models.models import Event, EventStaff

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.company_id == company_id, Event.deleted_at.is_(None))
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    member = _staff_member_or_none(db, user, company_id)
    if member:
        assigned = (
            db.query(EventStaff)
            .filter(EventStaff.event_id == event_id, EventStaff.company_member_id == member.id)
            .first()
        )
        if not assigned:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return event
