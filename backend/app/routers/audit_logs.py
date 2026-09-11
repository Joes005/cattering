from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_admin, require_permission
from app.db.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogOut

router = APIRouter(tags=["audit logs"])


def _to_out(log: AuditLog, actor_name: str | None) -> AuditLogOut:
    return AuditLogOut(
        id=log.id,
        company_id=log.company_id,
        actor_user_id=log.actor_user_id,
        actor_name=actor_name,
        action=log.action,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        old_value=log.old_value,
        new_value=log.new_value,
        created_at=log.created_at,
    )


@router.get("/api/audit-logs", response_model=list[AuditLogOut], dependencies=[Depends(require_admin)])
def list_platform_audit_logs(db: Session = Depends(get_db)):
    rows = (
        db.query(AuditLog, User)
        .outerjoin(User, User.id == AuditLog.actor_user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(500)
        .all()
    )
    return [_to_out(log, user.full_name if user else None) for log, user in rows]


@router.get("/api/companies/{company_id}/audit-logs", response_model=list[AuditLogOut])
def list_company_audit_logs(
    company_id: str, user: User = Depends(require_permission("audit_logs.view")), db: Session = Depends(get_db)
):
    rows = (
        db.query(AuditLog, User)
        .outerjoin(User, User.id == AuditLog.actor_user_id)
        .filter(AuditLog.company_id == company_id)
        .order_by(AuditLog.created_at.desc())
        .limit(500)
        .all()
    )
    return [_to_out(log, u.full_name if u else None) for log, u in rows]
