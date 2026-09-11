from sqlalchemy.orm import Session

from app.models.models import CompanyMember, EmploymentRole, MemberStatus, Notification


def notify(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    body: str | None = None,
    company_id: str | None = None,
    related_entity_type: str | None = None,
    related_entity_id: str | None = None,
) -> None:
    db.add(
        Notification(
            user_id=user_id,
            company_id=company_id,
            type=type,
            title=title,
            body=body,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
    )


def notify_company_managers(
    db: Session,
    company_id: str,
    type: str,
    title: str,
    body: str | None = None,
    related_entity_type: str | None = None,
    related_entity_id: str | None = None,
) -> None:
    managers = (
        db.query(CompanyMember)
        .filter(
            CompanyMember.company_id == company_id,
            CompanyMember.employment_role.in_([EmploymentRole.owner, EmploymentRole.manager]),
            CompanyMember.status == MemberStatus.active,
        )
        .all()
    )
    for member in managers:
        notify(db, member.user_id, type, title, body, company_id, related_entity_type, related_entity_id)
