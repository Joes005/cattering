from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_permission
from app.db.database import get_db
from app.models.models import Client
from app.schemas.schemas import ClientCreate, ClientOut

router = APIRouter(prefix="/api/companies/{company_id}/clients", tags=["clients"])


@router.post("", response_model=ClientOut, dependencies=[Depends(require_permission("clients.create"))])
def create_client(company_id: str, payload: ClientCreate, db: Session = Depends(get_db)):
    client = Client(company_id=company_id, **payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("", response_model=list[ClientOut], dependencies=[Depends(require_permission("clients.view"))])
def list_clients(company_id: str, db: Session = Depends(get_db)):
    return (
        db.query(Client)
        .filter(Client.company_id == company_id, Client.deleted_at.is_(None))
        .order_by(Client.created_at.desc())
        .all()
    )


@router.get("/{client_id}", response_model=ClientOut, dependencies=[Depends(require_permission("clients.view"))])
def get_client(company_id: str, client_id: str, db: Session = Depends(get_db)):
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.company_id == company_id, Client.deleted_at.is_(None))
        .first()
    )
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return client


@router.patch("/{client_id}", response_model=ClientOut, dependencies=[Depends(require_permission("clients.update"))])
def update_client(company_id: str, client_id: str, payload: ClientCreate, db: Session = Depends(get_db)):
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.company_id == company_id, Client.deleted_at.is_(None))
        .first()
    )
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client
