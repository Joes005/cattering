from sqlalchemy.orm import Session

from app.models.models import AuditLog


def log_action(
    db: Session,
    actor_user_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    company_id: str | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            company_id=company_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
        )
    )
