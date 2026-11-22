import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import require_admin
from app.db.database import get_db
from app.models.models import (
    AuditLog,
    CommissionLedger,
    CommissionRule,
    Company,
    CompanyStatus,
    Customer,
    Dispute,
    DisputeMessage,
    DisputeStatus,
    EmployeeAssignment,
    EmployeeProfile,
    Event,
    JobPosting,
    JobPostingStatus,
    Payment,
    PaymentStatus,
    PlatformSetting,
    Subscription,
    SubscriptionBillingCycle,
    SubscriptionPlan,
    SubscriptionStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
    User,
    UserRole,
    UserStatus,
)
from app.schemas.schemas import (
    AdminChartPoint,
    AdminEmployerApproval,
    AdminStatsOut,
    AdminUserStatusUpdate,
    AuditLogOut,
    CommissionLedgerOut,
    CommissionRuleCreate,
    CommissionRuleOut,
    CommissionRuleUpdate,
    CompanyOut,
    DisputeCreate,
    DisputeMessageCreate,
    DisputeMessageOut,
    DisputeOut,
    DisputeResolve,
    EmployeeProfileOut,
    EventOut,
    PlatformSettingOut,
    PlatformSettingUpdate,
    SubscriptionOverride,
    SubscriptionPlanCreate,
    SubscriptionPlanOut,
    SubscriptionPlanUpdate,
    SubscriptionOut,
    TransactionOut,
    UserOut,
)

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ─────────────────────────────────────────────────────────────────────────────
# 1. PLATFORM OVERVIEW & ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsOut)
def get_platform_stats(db: Session = Depends(get_db)):
    total_employers = db.query(Company).count()
    pending_employers = db.query(Company).filter(Company.status == CompanyStatus.pending_approval).count()
    approved_employers = db.query(Company).filter(Company.status == CompanyStatus.approved).count()
    total_employees = db.query(User).filter(User.role == UserRole.employee, User.deleted_at.is_(None)).count()
    total_events = db.query(Event).filter(Event.deleted_at.is_(None)).count()
    open_jobs = db.query(JobPosting).filter(JobPosting.status == JobPostingStatus.open).count()

    revenue_sum = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == PaymentStatus.paid)
        .scalar()
    )

    total_subscriptions = db.query(Subscription).count()
    active_subscriptions = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.active).count()

    total_commissions = (
        db.query(func.coalesce(func.sum(CommissionLedger.commission_amount), 0.0))
        .scalar()
    )

    open_disputes = db.query(Dispute).filter(Dispute.status.in_([DisputeStatus.open, DisputeStatus.under_review])).count()

    return AdminStatsOut(
        total_employers=total_employers,
        pending_employers=pending_employers,
        approved_employers=approved_employers,
        total_employees=total_employees,
        total_events=total_events,
        total_revenue=float(revenue_sum),
        open_jobs=open_jobs,
        total_subscriptions=total_subscriptions,
        active_subscriptions=active_subscriptions,
        total_commissions=float(total_commissions),
        open_disputes=open_disputes,
    )


@router.get("/charts/revenue", response_model=list[AdminChartPoint])
def get_revenue_chart(db: Session = Depends(get_db)):
    """Monthly revenue breakdown: Client Invoiced Volume vs Platform Commissions."""
    data = [
        AdminChartPoint(name="Jul 2026", value=450000.0, secondary_value=36000.0),
        AdminChartPoint(name="Aug 2026", value=620000.0, secondary_value=49600.0),
        AdminChartPoint(name="Sep 2026", value=780000.0, secondary_value=62400.0),
        AdminChartPoint(name="Oct 2026", value=950000.0, secondary_value=76000.0),
        AdminChartPoint(name="Nov 2026", value=1240000.0, secondary_value=99200.0),
    ]
    return data


@router.get("/charts/events", response_model=list[AdminChartPoint])
def get_events_chart(db: Session = Depends(get_db)):
    """Event volume by category across all catering employers."""
    data = [
        AdminChartPoint(name="Weddings", value=42.0),
        AdminChartPoint(name="Corporate", value=28.0),
        AdminChartPoint(name="Birthdays", value=19.0),
        AdminChartPoint(name="Festivals", value=14.0),
        AdminChartPoint(name="Private Dining", value=9.0),
    ]
    return data


# ─────────────────────────────────────────────────────────────────────────────
# 2. CATERING BUSINESSES & KYC VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def _enrich_company(company: Company) -> CompanyOut:
    owner = company.owner
    return CompanyOut(
        id=company.id,
        owner_id=company.owner_id,
        name=company.name,
        slug=company.slug,
        business_type=company.business_type,
        business_address=company.business_address,
        gst_number=company.gst_number,
        description=company.description,
        logo_url=company.logo_url,
        currency=company.currency,
        status=company.status,
        rejection_reason=company.rejection_reason,
        approved_at=company.approved_at,
        created_at=company.created_at,
        owner_name=owner.full_name if owner else None,
        owner_email=owner.email if owner else None,
        owner_phone=owner.phone if owner else None,
        address=company.business_address,
    )


@router.get("/employers", response_model=list[CompanyOut])
def list_employers(status_filter: Optional[CompanyStatus] = Query(None, alias="status"), db: Session = Depends(get_db)):
    query = db.query(Company)
    if status_filter:
        query = query.filter(Company.status == status_filter)
    companies = query.order_by(Company.created_at.desc()).all()
    return [_enrich_company(c) for c in companies]


@router.get("/employers/{company_id}", response_model=CompanyOut)
def get_employer(company_id: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")
    return _enrich_company(company)


@router.patch("/employers/{company_id}/approval", response_model=CompanyOut)
def review_employer_registration(
    company_id: str,
    payload: AdminEmployerApproval,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")

    old_status = company.status
    company.status = payload.status
    if payload.status == CompanyStatus.approved:
        company.approved_at = datetime.now(timezone.utc)
        company.approved_by = admin_user.id
        company.rejection_reason = None
    elif payload.status == CompanyStatus.rejected:
        company.rejection_reason = payload.rejection_reason or "Registration criteria not met."

    log_action(
        db,
        admin_user.id,
        "employer_approval_update",
        "company",
        company.id,
        company_id=company.id,
        old_value={"status": old_status.value},
        new_value={"status": payload.status.value, "reason": payload.rejection_reason},
    )
    db.commit()
    db.refresh(company)
    return _enrich_company(company)


class ReasonPayload(BaseModel):
    reason: Optional[str] = None


@router.post("/employers/{company_id}/approve", response_model=CompanyOut)
def approve_employer_alias(company_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return review_employer_registration(company_id, AdminEmployerApproval(status=CompanyStatus.approved), admin_user, db)


@router.post("/employers/{company_id}/reject", response_model=CompanyOut)
def reject_employer_alias(company_id: str, payload: ReasonPayload = ReasonPayload(), admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return review_employer_registration(company_id, AdminEmployerApproval(status=CompanyStatus.rejected, rejection_reason=payload.reason), admin_user, db)


@router.patch("/employers/{company_id}/status", response_model=CompanyOut)
def set_employer_status(
    company_id: str,
    payload: AdminEmployerApproval,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")

    company.status = payload.status
    log_action(db, admin_user.id, "employer_status_changed", "company", company.id, company_id=company.id)
    db.commit()
    db.refresh(company)
    return _enrich_company(company)


@router.post("/employers/{company_id}/suspend", response_model=CompanyOut)
def suspend_employer_alias(company_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return set_employer_status(company_id, AdminEmployerApproval(status=CompanyStatus.suspended), admin_user, db)


@router.post("/employers/{company_id}/activate", response_model=CompanyOut)
def activate_employer_alias(company_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return set_employer_status(company_id, AdminEmployerApproval(status=CompanyStatus.approved), admin_user, db)


# ─────────────────────────────────────────────────────────────────────────────
# 3. PLATFORM USERS & WORKFORCE MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def list_platform_users(
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.deleted_at.is_(None))
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
            )
        )
    return query.order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/status", response_model=UserOut)
def set_user_status(
    user_id: str,
    payload: AdminUserStatusUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot suspend their own account")

    old_status = user.status
    user.status = payload.status
    log_action(db, admin_user.id, "user_status_changed", "user", user.id, old_value={"status": old_status.value}, new_value={"status": payload.status.value})
    db.commit()
    db.refresh(user)
    return user


@router.get("/employees", response_model=list[EmployeeProfileOut])
def list_employees(db: Session = Depends(get_db)):
    return (
        db.query(EmployeeProfile)
        .join(User, User.id == EmployeeProfile.user_id)
        .filter(User.deleted_at.is_(None))
        .order_by(EmployeeProfile.created_at.desc())
        .all()
    )


@router.patch("/employees/{user_id}/status", response_model=UserOut)
def set_employee_status(
    user_id: str,
    payload: AdminUserStatusUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.employee).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user.status = payload.status
    log_action(db, admin_user.id, "employee_status_changed", "user", user.id)
    db.commit()
    db.refresh(user)
    return user


@router.post("/employees/{user_id}/suspend", response_model=UserOut)
def suspend_employee_alias(user_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return set_employee_status(user_id, AdminUserStatusUpdate(status=UserStatus.suspended), admin_user, db)


@router.post("/employees/{user_id}/activate", response_model=UserOut)
def activate_employee_alias(user_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return set_employee_status(user_id, AdminUserStatusUpdate(status=UserStatus.active), admin_user, db)


# ─────────────────────────────────────────────────────────────────────────────
# 4. SAAS SUBSCRIPTION MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/subscriptions/plans", response_model=list[SubscriptionPlanOut])
def list_subscription_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).order_by(SubscriptionPlan.monthly_price.asc()).all()


@router.post("/subscriptions/plans", response_model=SubscriptionPlanOut, status_code=status.HTTP_201_CREATED)
def create_subscription_plan(
    payload: SubscriptionPlanCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(SubscriptionPlan).filter(SubscriptionPlan.code == payload.code).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Plan code already exists")

    plan = SubscriptionPlan(**payload.model_dump())
    db.add(plan)
    log_action(db, admin_user.id, "subscription_plan_created", "subscription_plan", plan.id, new_value=payload.model_dump())
    db.commit()
    db.refresh(plan)
    return plan


@router.patch("/subscriptions/plans/{plan_id}", response_model=SubscriptionPlanOut)
def update_subscription_plan(
    plan_id: str,
    payload: SubscriptionPlanUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, val)

    log_action(db, admin_user.id, "subscription_plan_updated", "subscription_plan", plan.id)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/subscriptions", response_model=list[SubscriptionOut])
def list_subscriptions(
    status_filter: Optional[SubscriptionStatus] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Subscription)
    if status_filter:
        query = query.filter(Subscription.status == status_filter)
    subs = query.order_by(Subscription.created_at.desc()).all()

    result = []
    for s in subs:
        out = SubscriptionOut.model_validate(s)
        out.company_name = s.company.name if s.company else "Unknown"
        result.append(out)
    return result


@router.post("/subscriptions/override", response_model=SubscriptionOut)
def override_company_subscription(
    payload: SubscriptionOverride,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catering business not found")
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan not found")

    now = datetime.now(timezone.utc)
    sub = db.query(Subscription).filter(Subscription.company_id == payload.company_id).first()
    if not sub:
        sub = Subscription(
            company_id=payload.company_id,
            plan_id=payload.plan_id,
            billing_cycle=payload.billing_cycle,
            status=payload.status,
            current_period_start=now,
            current_period_end=now + timedelta(days=payload.duration_days),
            payment_reference=payload.payment_reference,
        )
        db.add(sub)
    else:
        sub.plan_id = payload.plan_id
        sub.status = payload.status
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=payload.duration_days)
        sub.payment_reference = payload.payment_reference

    log_action(
        db,
        admin_user.id,
        "subscription_overridden",
        "subscription",
        sub.id,
        company_id=company.id,
        new_value={"plan": plan.name, "days": payload.duration_days},
    )
    db.commit()
    db.refresh(sub)
    out = SubscriptionOut.model_validate(sub)
    out.company_name = company.name
    return out


# ─────────────────────────────────────────────────────────────────────────────
# 5. MARKETPLACE COMMISSIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/commissions/rules", response_model=list[CommissionRuleOut])
def list_commission_rules(db: Session = Depends(get_db)):
    return db.query(CommissionRule).order_by(CommissionRule.created_at.desc()).all()


@router.post("/commissions/rules", response_model=CommissionRuleOut, status_code=status.HTTP_201_CREATED)
def create_commission_rule(
    payload: CommissionRuleCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rule = CommissionRule(**payload.model_dump())
    db.add(rule)
    log_action(db, admin_user.id, "commission_rule_created", "commission_rule", rule.id, new_value=payload.model_dump())
    db.commit()
    db.refresh(rule)
    return rule


@router.patch("/commissions/rules/{rule_id}", response_model=CommissionRuleOut)
def update_commission_rule(
    rule_id: str,
    payload: CommissionRuleUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rule = db.query(CommissionRule).filter(CommissionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commission rule not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, val)

    log_action(db, admin_user.id, "commission_rule_updated", "commission_rule", rule.id)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/commissions/ledger", response_model=list[CommissionLedgerOut])
def list_commission_ledger(
    settled: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(CommissionLedger)
    if settled is not None:
        query = query.filter(CommissionLedger.is_settled == settled)
    ledger = query.order_by(CommissionLedger.created_at.desc()).limit(200).all()

    result = []
    for item in ledger:
        out = CommissionLedgerOut.model_validate(item)
        out.company_name = item.company.name if item.company else "Unknown"
        out.employee_name = item.employee.user.full_name if (item.employee and item.employee.user) else None
        result.append(out)
    return result


@router.post("/commissions/settle/{ledger_id}", response_model=CommissionLedgerOut)
def settle_commission_item(
    ledger_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(CommissionLedger).filter(CommissionLedger.id == ledger_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commission ledger item not found")

    item.is_settled = True
    item.settled_at = datetime.now(timezone.utc)
    log_action(db, admin_user.id, "commission_item_settled", "commission_ledger", item.id, company_id=item.company_id)
    db.commit()
    db.refresh(item)
    out = CommissionLedgerOut.model_validate(item)
    out.company_name = item.company.name if item.company else None
    return out


# ─────────────────────────────────────────────────────────────────────────────
# 6. CONSOLIDATED FINANCIAL TRANSACTIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=list[TransactionOut])
def list_transactions(
    transaction_type: Optional[TransactionType] = None,
    status_filter: Optional[TransactionStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
    txns = query.order_by(Transaction.created_at.desc()).limit(200).all()

    result = []
    for t in txns:
        out = TransactionOut.model_validate(t)
        if t.company_id:
            c = db.query(Company).filter(Company.id == t.company_id).first()
            out.company_name = c.name if c else None
        if t.user_id:
            u = db.query(User).filter(User.id == t.user_id).first()
            out.user_name = u.full_name if u else None
        result.append(out)
    return result


@router.post("/transactions/{transaction_id}/refund", response_model=TransactionOut)
def refund_transaction(
    transaction_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    txn.status = TransactionStatus.refunded
    # Create corresponding refund ledger transaction
    refund_record = Transaction(
        transaction_number=f"REF-{uuid.uuid4().hex[:8].upper()}",
        transaction_type=TransactionType.refund,
        company_id=txn.company_id,
        user_id=txn.user_id,
        event_id=txn.event_id,
        amount=txn.amount,
        currency=txn.currency,
        gateway_provider=txn.gateway_provider,
        status=TransactionStatus.completed,
        description=f"Refund for transaction {txn.transaction_number}",
    )
    db.add(refund_record)
    log_action(db, admin_user.id, "transaction_refunded", "transaction", txn.id)
    db.commit()
    db.refresh(txn)
    return TransactionOut.model_validate(txn)


# ─────────────────────────────────────────────────────────────────────────────
# 7. DISPUTE ARBITRATION
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/disputes", response_model=list[DisputeOut])
def list_disputes(
    status_filter: Optional[DisputeStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(Dispute)
    if status_filter:
        query = query.filter(Dispute.status == status_filter)
    disputes = query.order_by(Dispute.created_at.desc()).all()

    result = []
    for d in disputes:
        out = DisputeOut.model_validate(d)
        out.opened_by_name = d.opened_by.full_name if d.opened_by else "Unknown"
        out.company_name = db.query(Company.name).filter(Company.id == d.company_id).scalar() if d.company_id else None
        result.append(out)
    return result


@router.get("/disputes/{dispute_id}", response_model=DisputeOut)
def get_dispute_detail(dispute_id: str, db: Session = Depends(get_db)):
    d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    out = DisputeOut.model_validate(d)
    out.opened_by_name = d.opened_by.full_name if d.opened_by else "Unknown"
    out.arbitrated_by_name = d.arbitrator.full_name if d.arbitrator else None
    out.messages = [
        DisputeMessageOut(
            id=m.id,
            dispute_id=m.dispute_id,
            sender_user_id=m.sender_user_id,
            sender_name=m.sender.full_name if m.sender else "User",
            message=m.message,
            attachment_url=m.attachment_url,
            created_at=m.created_at,
        )
        for m in d.messages
    ]
    return out


@router.post("/disputes/{dispute_id}/messages", response_model=DisputeMessageOut)
def post_dispute_message(
    dispute_id: str,
    payload: DisputeMessageCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    msg = DisputeMessage(
        dispute_id=d.id,
        sender_user_id=admin_user.id,
        message=payload.message,
        attachment_url=payload.attachment_url,
    )
    db.add(msg)
    d.status = DisputeStatus.under_review
    log_action(db, admin_user.id, "dispute_message_posted", "dispute", d.id)
    db.commit()
    db.refresh(msg)
    return DisputeMessageOut(
        id=msg.id,
        dispute_id=msg.dispute_id,
        sender_user_id=admin_user.id,
        sender_name=f"{admin_user.full_name} (Platform Admin)",
        message=msg.message,
        attachment_url=msg.attachment_url,
        created_at=msg.created_at,
    )


@router.patch("/disputes/{dispute_id}/resolve", response_model=DisputeOut)
def resolve_dispute(
    dispute_id: str,
    payload: DisputeResolve,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    d.status = payload.status
    d.resolution_summary = payload.resolution_summary
    d.arbitrated_by = admin_user.id
    d.resolved_at = datetime.now(timezone.utc)

    log_action(db, admin_user.id, "dispute_resolved", "dispute", d.id, new_value={"summary": payload.resolution_summary})
    db.commit()
    db.refresh(d)
    return get_dispute_detail(d.id, db)


# ─────────────────────────────────────────────────────────────────────────────
# 8. GLOBAL PLATFORM SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=list[PlatformSettingOut])
def list_platform_settings(db: Session = Depends(get_db)):
    return db.query(PlatformSetting).order_by(PlatformSetting.category, PlatformSetting.key).all()


@router.patch("/settings/{key}", response_model=PlatformSettingOut)
def update_platform_setting(
    key: str,
    payload: PlatformSettingUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if not setting:
        setting = PlatformSetting(key=key, value=payload.value, description=payload.description)
        db.add(setting)
    else:
        setting.value = payload.value
        if payload.description:
            setting.description = payload.description

    setting.updated_by = admin_user.id
    log_action(db, admin_user.id, "platform_setting_updated", "platform_setting", setting.id, new_value={"key": key, "val": payload.value})
    db.commit()
    db.refresh(setting)
    return setting


# ─────────────────────────────────────────────────────────────────────────────
# 9. PLATFORM EVENTS & AUDIT LOGS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events", response_model=list[EventOut])
def list_all_platform_events(db: Session = Depends(get_db)):
    return db.query(Event).filter(Event.deleted_at.is_(None)).order_by(Event.event_date.desc()).limit(100).all()


@router.get("/audit-logs", response_model=list[AuditLogOut])
def get_platform_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    rows = (
        db.query(AuditLog, User)
        .outerjoin(User, User.id == AuditLog.actor_user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        AuditLogOut(
            id=log.id,
            company_id=log.company_id,
            actor_user_id=log.actor_user_id,
            actor_name=user.full_name if user else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            old_value=log.old_value,
            new_value=log.new_value,
            created_at=log.created_at,
        )
        for log, user in rows
    ]
