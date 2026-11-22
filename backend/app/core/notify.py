from sqlalchemy.orm import Session

from app.models.models import Company, Notification


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
    company = db.query(Company).filter(Company.id == company_id).first()
    if company and company.owner_id:
        notify(db, company.owner_id, type, title, body, company_id, related_entity_type, related_entity_id)
