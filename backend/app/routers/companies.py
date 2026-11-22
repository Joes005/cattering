from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import ensure_company_scope, get_current_user, require_admin, require_employer
from app.core.utils import slugify
from app.db.database import get_db
from app.models.models import (
    Company,
    CompanyStatus,
    Customer,
    Event,
    JobPosting,
    Subscription,
    SubscriptionBillingCycle,
    SubscriptionPlan,
    SubscriptionStatus,
    User,
    UserRole,
)
from app.schemas.schemas import (
    CompanyCreate,
    CompanyOut,
    CompanyPublicOut,
    CompanyUpdate,
    EmployerSubscribe,
    EmployerSubscriptionStatusOut,
    SubscriptionPlanOut,
)

router = APIRouter(prefix="/api/companies", tags=["companies"])


def _to_company_out(c: Company) -> CompanyOut:
    owner = c.owner
    return CompanyOut(
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
        owner_name=owner.full_name if owner else None,
        owner_email=owner.email if owner else None,
        owner_phone=owner.phone if owner else None,
        address=c.business_address,
    )


@router.get("", response_model=list[CompanyOut], dependencies=[Depends(require_admin)])
def list_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    return [_to_company_out(c) for c in companies]


@router.get("/public", response_model=list[CompanyPublicOut])
def list_public_companies(db: Session = Depends(get_db)):
    """Public directory of active catering companies for marketplace discovery."""
    return db.query(Company).filter(Company.status == CompanyStatus.approved).order_by(Company.name).all()


@router.get("/my-businesses", response_model=list[CompanyOut])
def list_my_businesses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all catering businesses owned by the authenticated employer (multi-business support)."""
    if user.role != UserRole.employer and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employer access required")

    companies = db.query(Company).filter(Company.owner_id == user.id).order_by(Company.created_at.desc()).all()
    return [_to_company_out(c) for c in companies]


@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def register_additional_business(
    payload: CompanyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allows an employer to register an additional catering business under their account."""
    if user.role != UserRole.employer and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only employers can register catering businesses")

    base_slug = slugify(payload.name)
    slug = base_slug
    counter = 1
    while db.query(Company).filter(Company.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    company = Company(
        owner_id=user.id,
        name=payload.name,
        slug=slug,
        business_type=payload.business_type,
        business_address=payload.business_address,
        gst_number=payload.gst_number,
        description=payload.description,
        logo_url=payload.logo_url,
        currency=payload.currency,
        status=CompanyStatus.pending_approval,
    )
    db.add(company)
    db.flush()

    log_action(
        db,
        user.id,
        "additional_company_registered",
        "company",
        company.id,
        company_id=company.id,
        new_value={"name": company.name, "status": "pending_approval"},
    )
    db.commit()
    db.refresh(company)
    return _to_company_out(company)


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")
    if user.role != UserRole.admin and company.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _to_company_out(company)


@router.patch("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    payload: CompanyUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")

    if user.role != UserRole.admin and company.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the business owner or admin can update settings")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    log_action(db, user.id, "company_updated", "company", company.id, company_id=company.id)
    db.commit()
    db.refresh(company)
    return _to_company_out(company)


# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYER SAAS SUBSCRIPTIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{company_id}/subscription", response_model=EmployerSubscriptionStatusOut)
def get_company_subscription_status(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")
    if user.role != UserRole.admin and company.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )

    plan = sub.plan if sub else db.query(SubscriptionPlan).filter(SubscriptionPlan.code == "starter").first()

    events_count = db.query(Event).filter(Event.company_id == company_id, Event.deleted_at.is_(None)).count()
    customers_count = db.query(Customer).filter(Customer.company_id == company_id, Customer.deleted_at.is_(None)).count()
    jobs_count = db.query(JobPosting).filter(JobPosting.company_id == company_id).count()

    return EmployerSubscriptionStatusOut(
        has_active_subscription=bool(sub and sub.status in [SubscriptionStatus.active, SubscriptionStatus.trialing]),
        status=sub.status if sub else None,
        plan=SubscriptionPlanOut.model_validate(plan) if plan else None,
        current_period_end=sub.current_period_end if sub else None,
        events_used_this_month=events_count,
        max_events_limit=plan.max_active_events_per_month if plan else 5,
        customers_count=customers_count,
        max_customers_limit=plan.max_customers if plan else 50,
        job_postings_count=jobs_count,
        max_job_postings_limit=plan.max_job_postings_per_month if plan else 10,
        custom_branding=plan.custom_branding if plan else False,
    )


@router.post("/{company_id}/subscription/subscribe", response_model=EmployerSubscriptionStatusOut)
def subscribe_plan(
    company_id: str,
    payload: EmployerSubscribe,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")
    if user.role != UserRole.admin and company.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only business owner can manage subscriptions")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == payload.plan_code).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan tier not found")

    now = datetime.now(timezone.utc)
    duration = 365 if payload.billing_cycle == SubscriptionBillingCycle.annual else 30

    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        sub = Subscription(
            company_id=company_id,
            plan_id=plan.id,
            billing_cycle=payload.billing_cycle,
            status=SubscriptionStatus.active,
            current_period_start=now,
            current_period_end=now + timedelta(days=duration),
            payment_reference=payload.payment_reference or "PORTAL_CHECKOUT",
        )
        db.add(sub)
    else:
        sub.plan_id = plan.id
        sub.billing_cycle = payload.billing_cycle
        sub.status = SubscriptionStatus.active
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=duration)
        sub.payment_reference = payload.payment_reference or "PORTAL_CHECKOUT"

    log_action(db, user.id, "employer_subscribed", "subscription", sub.id, company_id=company.id, new_value={"plan": plan.name})
    db.commit()
    db.refresh(sub)
    return get_company_subscription_status(company_id, user, db)
