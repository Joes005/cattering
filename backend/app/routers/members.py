from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import effective_permissions, hash_password, require_permission
from app.db.database import get_db
from app.models.models import (
    CompanyMember,
    GlobalRole,
    MemberPermissionOverride,
    Permission,
    PermissionEffect,
    User,
)
from app.schemas.schemas import CompanyMemberCreate, CompanyMemberOut, CompanyMemberUpdate, PermissionOverrideSet

router = APIRouter(prefix="/api/companies/{company_id}/members", tags=["members"])


@router.post("", response_model=CompanyMemberOut, dependencies=[Depends(require_permission("employees.create"))])
def add_member(company_id: str, payload: CompanyMemberCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        global_role=GlobalRole.company_user,
        phone=payload.phone,
    )
    db.add(user)
    db.flush()

    member = CompanyMember(
        company_id=company_id,
        user_id=user.id,
        employment_role=payload.employment_role,
        job_title=payload.job_title,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("", response_model=list[CompanyMemberOut], dependencies=[Depends(require_permission("employees.view"))])
def list_members(company_id: str, db: Session = Depends(get_db)):
    return (
        db.query(CompanyMember)
        .filter(CompanyMember.company_id == company_id)
        .order_by(CompanyMember.created_at.desc())
        .all()
    )


@router.patch(
    "/{member_id}", response_model=CompanyMemberOut, dependencies=[Depends(require_permission("employees.update"))]
)
def update_member(company_id: str, member_id: str, payload: CompanyMemberUpdate, db: Session = Depends(get_db)):
    member = (
        db.query(CompanyMember)
        .filter(CompanyMember.id == member_id, CompanyMember.company_id == company_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}/permissions", response_model=list[str])
def set_member_permission_overrides(
    company_id: str,
    member_id: str,
    payload: PermissionOverrideSet,
    actor: User = Depends(require_permission("employees.update")),
    db: Session = Depends(get_db),
):
    member = (
        db.query(CompanyMember)
        .filter(CompanyMember.id == member_id, CompanyMember.company_id == company_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    keys = set(payload.grants) | set(payload.revokes)
    perms = {p.key: p for p in db.query(Permission).filter(Permission.key.in_(keys)).all()}
    unknown = keys - perms.keys()
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown permission key(s): {', '.join(sorted(unknown))}")

    db.query(MemberPermissionOverride).filter(MemberPermissionOverride.company_member_id == member.id).delete()
    for key in payload.grants:
        db.add(MemberPermissionOverride(company_member_id=member.id, permission_id=perms[key].id, effect=PermissionEffect.grant))
    for key in payload.revokes:
        db.add(MemberPermissionOverride(company_member_id=member.id, permission_id=perms[key].id, effect=PermissionEffect.revoke))

    log_action(
        db, actor.id, "member_permissions_updated", "company_member", member.id, company_id=company_id,
        new_value={"grants": payload.grants, "revokes": payload.revokes},
    )
    db.commit()

    return sorted(effective_permissions(db, member.user, company_id))
