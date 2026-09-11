from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_permission
from app.db.database import get_db
from app.models.models import MenuCategory, MenuItem
from app.schemas.schemas import MenuCategoryCreate, MenuCategoryOut, MenuItemCreate, MenuItemOut

router = APIRouter(prefix="/api/companies/{company_id}", tags=["menus"])


@router.post(
    "/menu-categories", response_model=MenuCategoryOut, dependencies=[Depends(require_permission("menus.create"))]
)
def create_menu_category(company_id: str, payload: MenuCategoryCreate, db: Session = Depends(get_db)):
    category = MenuCategory(company_id=company_id, **payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get(
    "/menu-categories", response_model=list[MenuCategoryOut], dependencies=[Depends(require_permission("menus.view"))]
)
def list_menu_categories(company_id: str, db: Session = Depends(get_db)):
    return (
        db.query(MenuCategory).filter(MenuCategory.company_id == company_id).order_by(MenuCategory.sort_order).all()
    )


@router.post("/menu-items", response_model=MenuItemOut, dependencies=[Depends(require_permission("menus.create"))])
def create_menu_item(company_id: str, payload: MenuItemCreate, db: Session = Depends(get_db)):
    if payload.category_id:
        category = (
            db.query(MenuCategory)
            .filter(MenuCategory.id == payload.category_id, MenuCategory.company_id == company_id)
            .first()
        )
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu category not found")

    item = MenuItem(company_id=company_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/menu-items", response_model=list[MenuItemOut], dependencies=[Depends(require_permission("menus.view"))])
def list_menu_items(company_id: str, db: Session = Depends(get_db)):
    return db.query(MenuItem).filter(MenuItem.company_id == company_id).order_by(MenuItem.name).all()


@router.patch(
    "/menu-items/{item_id}", response_model=MenuItemOut, dependencies=[Depends(require_permission("menus.update"))]
)
def update_menu_item(company_id: str, item_id: str, payload: MenuItemCreate, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.company_id == company_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("menus.delete"))]
)
def delete_menu_item(company_id: str, item_id: str, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.company_id == company_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(item)
    db.commit()
