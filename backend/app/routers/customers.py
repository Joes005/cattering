from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import ensure_company_scope, require_employer
from app.db.database import get_db
from app.models.models import Customer, User
from app.schemas.schemas import CustomerCreate, CustomerOut, CustomerUpdate

router = APIRouter(prefix="/api/companies/{company_id}/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    company_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)
    return (
        db.query(Customer)
        .filter(Customer.company_id == company_id, Customer.deleted_at.is_(None))
        .order_by(Customer.created_at.desc())
        .all()
    )


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    company_id: str,
    payload: CustomerCreate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    customer = Customer(
        company_id=company_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        notes=payload.notes,
    )
    db.add(customer)
    log_action(db, user.id, "customer_created", "customer", customer.id, company_id=company_id)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    company_id: str,
    customer_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.company_id == company_id, Customer.deleted_at.is_(None))
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    company_id: str,
    customer_id: str,
    payload: CustomerUpdate,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.company_id == company_id, Customer.deleted_at.is_(None))
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, val)

    log_action(db, user.id, "customer_updated", "customer", customer.id, company_id=company_id)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    company_id: str,
    customer_id: str,
    auth: tuple = Depends(require_employer),
    db: Session = Depends(get_db),
):
    user, company = auth
    ensure_company_scope(user, company_id, company)

    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.company_id == company_id, Customer.deleted_at.is_(None))
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    customer.deleted_at = func.now()
    log_action(db, user.id, "customer_deleted", "customer", customer.id, company_id=company_id)
    db.commit()
    return None

