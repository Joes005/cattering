from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import ensure_company_scope, require_employee, require_employer
from app.db.database import get_db
from app.models.models import (
    ApplicationStatus,
    AssignmentStatus,
    Attendance,
    AttendanceStatus,
    Company,
    CompanyStatus,
    EmployeeAssignment,
    EmployeeEarning,
    EmployeeProfile,
    Event,
    JobApplication,
    JobPosting,
    JobPostingStatus,
    PayoutStatus,
    User,
)
from app.schemas.schemas import (
    AttendanceCheckInOut,
    AttendanceOut,
    AttendanceVerify,
    CompanyOut,
    EmployeeAssignmentCreate,
    EmployeeAssignmentOut,
    EmployeeEarningOut,
    EmployeeEarningsSummaryOut,
    EmployeeProfileOut,
    EmployeeProfileUpdate,
    EventOut,
    JobApplicationCreate,
    JobApplicationOut,
    JobApplicationReview,
    JobPostingCreate,
    JobPostingOut,
    JobPostingUpdate,
    PayoutUpdate,
)

# Sub-routers for workforce operations
employer_router = APIRouter(prefix="/api/companies/{company_id}/marketplace", tags=["employer-marketplace"])
direct_employer_router = APIRouter(prefix="/api/companies/{company_id}", tags=["employer-workforce-direct"])
employee_router = APIRouter(prefix="/api/employee", tags=["employee-marketplace"])


# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYER WORKFORCE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@employer_router.post("/postings", response_model=JobPostingOut, status_code=status.HTTP_201_CREATED)
@employer_router.post("/jobs", response_model=JobPostingOut, status_code=status.HTTP_201_CREATED)
@direct_employer_router.post("/postings", response_model=JobPostingOut, status_code=status.HTTP_201_CREATED)
@direct_employer_router.post("/jobs", response_model=JobPostingOut, status_code=status.HTTP_201_CREATED)
def create_job_posting(
    company_id: str,
    payload: JobPostingCreate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    event = db.query(Event).filter(Event.id == payload.event_id, Event.company_id == company_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in your company")

    posting = JobPosting(
        company_id=company_id,
        event_id=payload.event_id,
        role_title=payload.role_title,
        description=payload.description,
        required_count=payload.required_count,
        shift_start=payload.shift_start,
        shift_end=payload.shift_end,
        pay_rate=payload.pay_rate,
        pay_type=payload.pay_type,
        location=payload.location,
        status=JobPostingStatus.open,
    )
    db.add(posting)
    log_action(db, user.id, "job_posting_created", "job_posting", posting.id, company_id=company_id)
    db.commit()
    db.refresh(posting)
    return posting


@employer_router.get("/postings", response_model=list[JobPostingOut])
@employer_router.get("/jobs", response_model=list[JobPostingOut])
@direct_employer_router.get("/postings", response_model=list[JobPostingOut])
@direct_employer_router.get("/jobs", response_model=list[JobPostingOut])
def list_company_job_postings(
    company_id: str,
    event_id: Optional[str] = None,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    query = db.query(JobPosting).filter(JobPosting.company_id == company_id)
    if event_id:
        query = query.filter(JobPosting.event_id == event_id)
    return query.order_by(JobPosting.created_at.desc()).all()


@employer_router.get("/postings/{posting_id}", response_model=JobPostingOut)
@employer_router.get("/jobs/{posting_id}", response_model=JobPostingOut)
@direct_employer_router.get("/postings/{posting_id}", response_model=JobPostingOut)
@direct_employer_router.get("/jobs/{posting_id}", response_model=JobPostingOut)
def get_job_posting(
    company_id: str,
    posting_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    posting = db.query(JobPosting).filter(JobPosting.id == posting_id, JobPosting.company_id == company_id).first()
    if not posting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    return posting


@employer_router.patch("/postings/{posting_id}", response_model=JobPostingOut)
def update_job_posting(
    company_id: str,
    posting_id: str,
    payload: JobPostingUpdate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    posting = db.query(JobPosting).filter(JobPosting.id == posting_id, JobPosting.company_id == company_id).first()
    if not posting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(posting, field, val)

    db.commit()
    db.refresh(posting)
    return posting


@employer_router.get("/applications", response_model=list[JobApplicationOut])
@employer_router.get("/jobs/{posting_id}/applications", response_model=list[JobApplicationOut])
@direct_employer_router.get("/applications", response_model=list[JobApplicationOut])
@direct_employer_router.get("/jobs/{posting_id}/applications", response_model=list[JobApplicationOut])
def list_applications(
    company_id: str,
    posting_id: Optional[str] = None,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    query = db.query(JobApplication).join(JobPosting, JobPosting.id == JobApplication.job_posting_id).filter(JobPosting.company_id == company_id)
    if posting_id:
        query = query.filter(JobApplication.job_posting_id == posting_id)
    return query.order_by(JobApplication.applied_at.desc()).all()


@employer_router.patch("/applications/{app_id}/review", response_model=JobApplicationOut)
@employer_router.patch("/applications/{app_id}", response_model=JobApplicationOut)
@employer_router.post("/applications/{app_id}/status", response_model=JobApplicationOut)
@direct_employer_router.patch("/applications/{app_id}/review", response_model=JobApplicationOut)
@direct_employer_router.patch("/applications/{app_id}", response_model=JobApplicationOut)
@direct_employer_router.post("/applications/{app_id}/status", response_model=JobApplicationOut)
def review_application(
    company_id: str,
    app_id: str,
    payload: JobApplicationReview,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    application = (
        db.query(JobApplication)
        .join(JobPosting, JobPosting.id == JobApplication.job_posting_id)
        .filter(JobApplication.id == app_id, JobPosting.company_id == company_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    application.status = payload.status
    application.employer_notes = payload.employer_notes
    application.reviewed_at = datetime.now(timezone.utc)

    # If accepted, create or update confirmed EmployeeAssignment
    posting = application.job_posting
    if payload.status == ApplicationStatus.accepted:
        # Check if already assigned for this event
        existing_asg = (
            db.query(EmployeeAssignment)
            .filter(EmployeeAssignment.event_id == posting.event_id, EmployeeAssignment.employee_id == application.employee_id)
            .first()
        )
        if existing_asg:
            existing_asg.job_posting_id = posting.id
            existing_asg.event_role = posting.role_title
            existing_asg.shift_start = posting.shift_start
            existing_asg.shift_end = posting.shift_end
            existing_asg.agreed_pay = posting.pay_rate
            existing_asg.status = AssignmentStatus.confirmed
        else:
            asg = EmployeeAssignment(
                company_id=company_id,
                event_id=posting.event_id,
                job_posting_id=posting.id,
                employee_id=application.employee_id,
                event_role=posting.role_title,
                shift_start=posting.shift_start,
                shift_end=posting.shift_end,
                agreed_pay=posting.pay_rate,
                status=AssignmentStatus.confirmed,
                notes=f"Accepted from application {application.id}",
            )
            db.add(asg)
            db.flush()

            # Init attendance record
            att = Attendance(assignment_id=asg.id, status=AttendanceStatus.present)
            db.add(att)

            # Init earning record
            earn = EmployeeEarning(
                assignment_id=asg.id,
                employee_id=application.employee_id,
                company_id=company_id,
                amount=posting.pay_rate,
                status=PayoutStatus.pending,
            )
            db.add(earn)

        posting.filled_count += 1
        if posting.filled_count >= posting.required_count:
            posting.status = JobPostingStatus.filled

    db.commit()
    db.refresh(application)
    return application


@employer_router.get("/assignments", response_model=list[EmployeeAssignmentOut])
@direct_employer_router.get("/assignments", response_model=list[EmployeeAssignmentOut])
def list_company_assignments(
    company_id: str,
    event_id: Optional[str] = None,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    query = db.query(EmployeeAssignment).filter(EmployeeAssignment.company_id == company_id)
    if event_id:
        query = query.filter(EmployeeAssignment.event_id == event_id)
    return query.order_by(EmployeeAssignment.shift_start.desc()).all()


@employer_router.get("/attendance", response_model=list[AttendanceOut])
@direct_employer_router.get("/attendance", response_model=list[AttendanceOut])
def list_company_attendance(
    company_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    return (
        db.query(Attendance)
        .join(EmployeeAssignment, EmployeeAssignment.id == Attendance.assignment_id)
        .filter(EmployeeAssignment.company_id == company_id)
        .order_by(Attendance.check_in.desc().nullslast())
        .all()
    )


@employer_router.patch("/attendance/{assignment_id}/verify", response_model=AttendanceOut)
@employer_router.post("/attendance/{assignment_id}/verify", response_model=AttendanceOut)
@direct_employer_router.patch("/attendance/{assignment_id}/verify", response_model=AttendanceOut)
@direct_employer_router.post("/attendance/{assignment_id}/verify", response_model=AttendanceOut)
def verify_attendance(
    company_id: str,
    assignment_id: str,
    payload: AttendanceVerify,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    attendance = (
        db.query(Attendance)
        .join(EmployeeAssignment, EmployeeAssignment.id == Attendance.assignment_id)
        .filter(Attendance.assignment_id == assignment_id, EmployeeAssignment.company_id == company_id)
        .first()
    )
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    attendance.hours_worked = payload.hours_worked
    attendance.status = payload.status
    attendance.verified_by_employer = payload.verified_by_employer
    if payload.notes:
        attendance.notes = payload.notes

    # Auto-approve earning if verified
    if payload.verified_by_employer:
        earning = db.query(EmployeeEarning).filter(EmployeeEarning.assignment_id == assignment_id).first()
        if earning:
            earning.status = PayoutStatus.approved

    db.commit()
    db.refresh(attendance)
    return attendance


@employer_router.get("/earnings", response_model=list[EmployeeEarningOut])
@employer_router.get("/payouts", response_model=list[EmployeeEarningOut])
@direct_employer_router.get("/earnings", response_model=list[EmployeeEarningOut])
@direct_employer_router.get("/payouts", response_model=list[EmployeeEarningOut])
def list_company_payouts(
    company_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    return (
        db.query(EmployeeEarning)
        .filter(EmployeeEarning.company_id == company_id)
        .order_by(EmployeeEarning.created_at.desc())
        .all()
    )


@employer_router.patch("/earnings/{earning_id}/status", response_model=EmployeeEarningOut)
@employer_router.post("/payouts/{earning_id}/status", response_model=EmployeeEarningOut)
@employer_router.patch("/payouts/{earning_id}/status", response_model=EmployeeEarningOut)
@direct_employer_router.patch("/earnings/{earning_id}/status", response_model=EmployeeEarningOut)
@direct_employer_router.post("/payouts/{earning_id}/status", response_model=EmployeeEarningOut)
@direct_employer_router.patch("/payouts/{earning_id}/status", response_model=EmployeeEarningOut)
def update_payout_status(
    company_id: str,
    earning_id: str,
    payload: PayoutUpdate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    earning = (
        db.query(EmployeeEarning)
        .filter(EmployeeEarning.id == earning_id, EmployeeEarning.company_id == company_id)
        .first()
    )
    if not earning:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout record not found")

    earning.status = payload.status
    if payload.status == PayoutStatus.paid:
        earning.paid_at = datetime.now(timezone.utc)
        earning.payment_reference = payload.payment_reference or "Direct Transfer"

    db.commit()
    db.refresh(earning)
    return earning


@employer_router.get("/workforce/browse", response_model=list[EmployeeProfileOut])
def browse_workforce(
    company_id: str,
    location: Optional[str] = None,
    skill: Optional[str] = None,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    query = db.query(EmployeeProfile).join(User, User.id == EmployeeProfile.user_id).filter(User.status == "active")
    if location:
        query = query.filter(EmployeeProfile.location.ilike(f"%{location}%"))
    return query.order_by(EmployeeProfile.rating.desc(), EmployeeProfile.total_completed_events.desc()).limit(50).all()


# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE PORTAL ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@employee_router.get("/profile", response_model=EmployeeProfileOut)
def get_my_profile(
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    return profile


@employee_router.patch("/profile", response_model=EmployeeProfileOut)
@employee_router.put("/profile", response_model=EmployeeProfileOut)
def update_my_profile(
    payload: EmployeeProfileUpdate,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "is_available" and val is not None:
            profile.availability_status = "available" if val else "unavailable"
        elif hasattr(profile, field):
            setattr(profile, field, val)
    db.commit()
    db.refresh(profile)
    return profile


@employee_router.get("/jobs", response_model=list[JobPostingOut])
def browse_open_jobs(
    location: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    query = (
        db.query(JobPosting)
        .join(Company, Company.id == JobPosting.company_id)
        .filter(
            JobPosting.status == JobPostingStatus.open,
            Company.status == CompanyStatus.approved,
            JobPosting.shift_start >= datetime.now(timezone.utc) - timedelta(hours=2),
        )
    )
    if search:
        query = query.filter(
            (JobPosting.role_title.ilike(f"%{search}%"))
            | (JobPosting.location.ilike(f"%{search}%"))
            | (Company.name.ilike(f"%{search}%"))
        )
    if location:
        query = query.filter(JobPosting.location.ilike(f"%{location}%"))
    if role:
        query = query.filter(JobPosting.role_title.ilike(f"%{role}%"))
    return query.order_by(JobPosting.shift_start.asc()).all()


@employee_router.get("/jobs/{job_id}", response_model=JobPostingOut)
def get_job_detail(
    job_id: str,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    posting = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not posting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    return posting


@employee_router.post("/jobs/{job_id}/apply", response_model=JobApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_for_job(
    job_id: str,
    payload: JobApplicationCreate,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth

    posting = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not posting or posting.status != JobPostingStatus.open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job posting is no longer open")

    existing = (
        db.query(JobApplication)
        .filter(JobApplication.job_posting_id == job_id, JobApplication.employee_id == profile.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already applied for this job")

    application = JobApplication(
        job_posting_id=job_id,
        employee_id=profile.id,
        cover_note=payload.cover_note,
        status=ApplicationStatus.applied,
    )
    db.add(application)
    log_action(db, user.id, "job_application_submitted", "job_application", application.id)
    db.commit()
    db.refresh(application)
    return application


@employee_router.get("/applications", response_model=list[JobApplicationOut])
def get_my_applications(
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    return (
        db.query(JobApplication)
        .filter(JobApplication.employee_id == profile.id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )


@employee_router.delete("/applications/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def withdraw_application(
    app_id: str,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    app_record = (
        db.query(JobApplication)
        .filter(JobApplication.id == app_id, JobApplication.employee_id == profile.id)
        .first()
    )
    if not app_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if app_record.status == ApplicationStatus.accepted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot withdraw an accepted assignment")

    app_record.status = ApplicationStatus.withdrawn
    db.commit()
    return None


@employee_router.get("/schedule", response_model=list[EmployeeAssignmentOut])
def get_my_schedule(
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    assignments = (
        db.query(EmployeeAssignment)
        .filter(EmployeeAssignment.employee_id == profile.id)
        .order_by(EmployeeAssignment.shift_start.asc())
        .all()
    )
    result = []
    for asg in assignments:
        result.append(
            EmployeeAssignmentOut(
                id=asg.id,
                company_id=asg.company_id,
                event_id=asg.event_id,
                job_posting_id=asg.job_posting_id,
                employee_id=asg.employee_id,
                event_role=asg.event_role,
                role=asg.event_role,
                shift_start=asg.shift_start,
                shift_end=asg.shift_end,
                agreed_pay=asg.agreed_pay,
                agreed_pay_rate=asg.agreed_pay,
                status=asg.status,
                notes=asg.notes,
                created_at=asg.created_at,
                company=CompanyOut.model_validate(asg.company) if asg.company else None,
                employee=EmployeeProfileOut.model_validate(asg.employee) if asg.employee else None,
                event=EventOut.model_validate(asg.event) if asg.event else None,
                attendance=AttendanceOut.model_validate(asg.attendance) if asg.attendance else None,
            )
        )
    return result


@employee_router.post("/attendance/check", response_model=AttendanceOut)
def employee_check_in_out(
    payload: AttendanceCheckInOut,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    asg = (
        db.query(EmployeeAssignment)
        .filter(EmployeeAssignment.id == payload.assignment_id, EmployeeAssignment.employee_id == profile.id)
        .first()
    )
    if not asg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    att = db.query(Attendance).filter(Attendance.assignment_id == asg.id).first()
    if not att:
        att = Attendance(assignment_id=asg.id, status=AttendanceStatus.present)
        db.add(att)

    now = datetime.now(timezone.utc)
    if payload.action == "check_in":
        att.check_in = now
        asg.status = AssignmentStatus.in_progress
    elif payload.action == "check_out":
        att.check_out = now
        asg.status = AssignmentStatus.completed
        if att.check_in:
            diff_hours = (now - att.check_in).total_seconds() / 3600.0
            att.hours_worked = max(1.0, round(diff_hours, 2))
            profile.total_completed_events += 1

            earning = db.query(EmployeeEarning).filter(EmployeeEarning.assignment_id == asg.id).first()
            if earning:
                earning.amount = round(att.hours_worked * asg.agreed_pay, 2)
            else:
                earning = EmployeeEarning(
                    assignment_id=asg.id,
                    employee_id=profile.id,
                    company_id=asg.company_id,
                    amount=round(att.hours_worked * asg.agreed_pay, 2),
                    status=PayoutStatus.pending,
                )
                db.add(earning)

    if payload.notes:
        att.notes = payload.notes

    db.commit()
    db.refresh(att)
    return att


@employee_router.post("/assignments/{assignment_id}/check-in", response_model=AttendanceOut)
def direct_check_in(
    assignment_id: str,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    return employee_check_in_out(AttendanceCheckInOut(assignment_id=assignment_id, action="check_in"), auth, db)


@employee_router.post("/assignments/{assignment_id}/check-out", response_model=AttendanceOut)
def direct_check_out(
    assignment_id: str,
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    return employee_check_in_out(AttendanceCheckInOut(assignment_id=assignment_id, action="check_out"), auth, db)


@employee_router.get("/attendance", response_model=list[AttendanceOut])
def get_my_attendance_history(
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    return (
        db.query(Attendance)
        .join(EmployeeAssignment, EmployeeAssignment.id == Attendance.assignment_id)
        .filter(EmployeeAssignment.employee_id == profile.id)
        .order_by(Attendance.check_in.desc().nullslast())
        .all()
    )


@employee_router.get("/earnings", response_model=list[EmployeeEarningOut])
def get_my_earnings(
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    earnings = (
        db.query(EmployeeEarning)
        .filter(EmployeeEarning.employee_id == profile.id)
        .order_by(EmployeeEarning.created_at.desc())
        .all()
    )

    payout_outs = []
    for e in earnings:
        asg = e.assignment
        ev = asg.event if asg else None
        att = asg.attendance if asg else None

        hours = att.hours_worked if (att and att.hours_worked) else 4.0
        rate = asg.agreed_pay if asg else (e.amount / hours if hours else 150.0)
        amt = e.amount

        payout_outs.append(
            EmployeeEarningOut(
                id=e.id,
                assignment_id=e.assignment_id,
                employee_id=e.employee_id,
                company_id=e.company_id,
                amount=amt,
                total_amount=amt,
                status=e.status,
                payment_reference=e.payment_reference,
                paid_at=e.paid_at,
                created_at=e.created_at,
                company=CompanyOut.model_validate(e.company) if e.company else None,
                event_title=ev.title if ev else "Catering Shift",
                hours_worked=hours,
                hourly_rate=rate,
            )
        )
    return payout_outs


@employee_router.get("/earnings/summary", response_model=EmployeeEarningsSummaryOut)
def get_my_earnings_summary(
    auth: tuple = Depends(require_employee),
    db: Session = Depends(get_db),
):
    user, profile = auth
    payout_outs = get_my_earnings(auth, db)
    total_earned = sum(p.total_amount or p.amount for p in payout_outs)
    paid_out = sum(p.total_amount or p.amount for p in payout_outs if p.status == PayoutStatus.paid)
    pending_payout = total_earned - paid_out

    return EmployeeEarningsSummaryOut(
        total_earnings=round(total_earned, 2),
        paid_out=round(paid_out, 2),
        pending_payout=round(pending_payout, 2),
        completed_shifts_count=profile.total_completed_events,
        payouts=payout_outs,
    )
