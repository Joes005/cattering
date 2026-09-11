from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_permission
from app.db.database import get_db
from app.models.models import InventoryItem, InventoryTransaction, InventoryTxnType
from app.schemas.schemas import (
    InventoryItemCreate,
    InventoryItemOut,
    InventoryTransactionCreate,
    InventoryTransactionOut,
)

router = APIRouter(prefix="/api/companies/{company_id}/inventory", tags=["inventory"])


def _to_out(item: InventoryItem) -> InventoryItemOut:
    out = InventoryItemOut.model_validate(item)
    out.is_low_stock = item.stock_qty <= item.min_stock
    return out


@router.post("", response_model=InventoryItemOut, dependencies=[Depends(require_permission("inventory.update"))])
def create_item(company_id: str, payload: InventoryItemCreate, db: Session = Depends(get_db)):
    item = InventoryItem(company_id=company_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.get("", response_model=list[InventoryItemOut], dependencies=[Depends(require_permission("inventory.view"))])
def list_items(company_id: str, db: Session = Depends(get_db)):
    items = db.query(InventoryItem).filter(InventoryItem.company_id == company_id).order_by(InventoryItem.name).all()
    return [_to_out(i) for i in items]


@router.post(
    "/{item_id}/transactions",
    response_model=InventoryTransactionOut,
    dependencies=[Depends(require_permission("inventory.update"))],
)
def record_transaction(company_id: str, item_id: str, payload: InventoryTransactionCreate, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.company_id == company_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    try:
        txn_type = InventoryTxnType(payload.type)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid transaction type")

    transaction = InventoryTransaction(
        item_id=item.id, event_id=payload.event_id, change_qty=payload.change_qty, type=txn_type
    )
    db.add(transaction)
    item.stock_qty += payload.change_qty
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get(
    "/{item_id}/transactions",
    response_model=list[InventoryTransactionOut],
    dependencies=[Depends(require_permission("inventory.view"))],
)
def list_transactions(company_id: str, item_id: str, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.company_id == company_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return (
        db.query(InventoryTransaction)
        .filter(InventoryTransaction.item_id == item_id)
        .order_by(InventoryTransaction.created_at.desc())
        .all()
    )
