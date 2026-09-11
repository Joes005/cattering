from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import get_current_user, get_membership, hash_password, require_admin
from app.core.utils import slugify
from app.db.database import get_db
from app.models.models import Company, CompanyMember, CompanyStatus, EmploymentRole, GlobalRole, User
from app.schemas.schemas import CompanyCreate, CompanyOut, CompanyPublicOut, CompanyUpdate

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.post("", response_model=CompanyOut)
def create_company(payload: CompanyCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.owner_email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Owner email already registered")

    company = Company(name=payload.name, slug=slugify(payload.name), gst_number=payload.gst_number, currency=payload.currency)
    db.add(company)
    db.flush()

    owner = User(
        full_name=payload.owner_name,
        email=payload.owner_email,
        password_hash=hash_password(payload.owner_password),
        global_role=GlobalRole.company_user,
    )
    db.add(owner)
    db.flush()

    db.add(CompanyMember(company_id=company.id, user_id=owner.id, employment_role=EmploymentRole.owner, job_title="Owner"))
    log_action(db, admin.id, "company_created", "company", company.id, company_id=company.id, new_value={"name": company.name})
    db.commit()
    db.refresh(company)
    return company


@router.get("", response_model=list[CompanyOut], dependencies=[Depends(require_admin)])
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.get("/public", response_model=list[CompanyPublicOut])
def list_public_companies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Minimal, non-sensitive company directory so a client can pick who to book with."""
    return db.query(Company).filter(Company.status == CompanyStatus.active).order_by(Company.name).all()


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if user.global_role != GlobalRole.admin and not get_membership(db, user, company_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return company


@router.patch("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    payload: CompanyUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if user.global_role == GlobalRole.admin:
        pass
    else:
        member = get_membership(db, user, company_id)
        if not member or member.employment_role not in (EmploymentRole.owner, EmploymentRole.manager):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an owner or manager can update company settings")
        if payload.status is not None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an admin can change company status")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company
