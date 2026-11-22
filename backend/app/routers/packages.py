from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_permission
from app.db.database import get_db
from app.models.models import Company, CompanyStatus, MenuItem, Package, PackageItem, User
from app.schemas.schemas import PackageCreate, PackageDetailOut, PackageOut

router = APIRouter(prefix="/api/companies/{company_id}/packages", tags=["packages"])
public_router = APIRouter(prefix="/api/companies/{company_id}/public", tags=["packages"])


def _create_package(db: Session, company_id: str, payload: PackageCreate) -> Package:
    menu_item_ids = [i.menu_item_id for i in payload.items]
    if menu_item_ids:
        found = (
            db.query(MenuItem.id)
            .filter(MenuItem.id.in_(menu_item_ids), MenuItem.company_id == company_id)
            .all()
        )
        if len(found) != len(set(menu_item_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more menu items were not found")

    package = Package(company_id=company_id, **payload.model_dump(exclude={"items", "item_ids", "base_price"}))
    db.add(package)
    db.flush()
    for item in payload.items:
        db.add(PackageItem(package_id=package.id, menu_item_id=item.menu_item_id, note=item.note))
    db.commit()
    db.refresh(package)
    return package


@router.post("", response_model=PackageDetailOut, dependencies=[Depends(require_permission("menus.create"))])
def create_package(company_id: str, payload: PackageCreate, db: Session = Depends(get_db)):
    return _create_package(db, company_id, payload)


@router.get("", response_model=list[PackageOut], dependencies=[Depends(require_permission("menus.view"))])
def list_packages(company_id: str, db: Session = Depends(get_db)):
    return db.query(Package).filter(Package.company_id == company_id).order_by(Package.name).all()


@router.get("/{package_id}", response_model=PackageDetailOut, dependencies=[Depends(require_permission("menus.view"))])
def get_package(company_id: str, package_id: str, db: Session = Depends(get_db)):
    package = db.query(Package).filter(Package.id == package_id, Package.company_id == company_id).first()
    if not package:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return package


@router.delete(
    "/{package_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("menus.delete"))]
)
def delete_package(company_id: str, package_id: str, db: Session = Depends(get_db)):
    package = db.query(Package).filter(Package.id == package_id, Package.company_id == company_id).first()
    if not package:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(package)
    db.commit()


@public_router.get("/packages", response_model=list[PackageOut])
def list_public_packages(company_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Active packages, visible to any signed-in user (clients browsing before booking)."""
    company = db.query(Company).filter(Company.id == company_id, Company.status == CompanyStatus.active).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return (
        db.query(Package)
        .filter(Package.company_id == company_id, Package.is_active.is_(True))
        .order_by(Package.price)
        .all()
    )
