from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.models.models import Package, User, VendorProfile
from app.schemas.schemas import PackageCreate, PackageOut, PackageWithVendorOut

router = APIRouter(prefix="/api/packages", tags=["packages"])


@router.get("", response_model=list[PackageWithVendorOut])
def list_packages(
    category_id: Optional[str] = None,
    city: Optional[str] = None,
    max_price: Optional[float] = None,
    guest_count: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Package).options(joinedload(Package.vendor)).join(VendorProfile).filter(
        Package.is_active.is_(True)
    )
    if category_id:
        query = query.filter(Package.category_id == category_id)
    if city:
        query = query.filter(VendorProfile.city.ilike(f"%{city}%"))
    if max_price is not None:
        query = query.filter(Package.price_per_plate <= max_price)
    if guest_count is not None:
        query = query.filter(Package.min_guests <= guest_count, Package.max_guests >= guest_count)
    return query.order_by(Package.created_at.desc()).all()


@router.get("/{package_id}", response_model=PackageWithVendorOut)
def get_package(package_id: str, db: Session = Depends(get_db)):
    pkg = (
        db.query(Package)
        .options(joinedload(Package.vendor))
        .filter(Package.id == package_id)
        .first()
    )
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return pkg


@router.post("", response_model=PackageOut)
def create_package(
    payload: PackageCreate,
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    profile = db.query(VendorProfile).filter(VendorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Create your vendor profile first")

    pkg = Package(vendor_id=profile.id, **payload.model_dump())
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.put("/{package_id}", response_model=PackageOut)
def update_package(
    package_id: str,
    payload: PackageCreate,
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    pkg = db.query(Package).join(VendorProfile).filter(Package.id == package_id).first()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    if pkg.vendor.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your package")

    for field, value in payload.model_dump().items():
        setattr(pkg, field, value)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.delete("/{package_id}")
def delete_package(
    package_id: str,
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    pkg = db.query(Package).join(VendorProfile).filter(Package.id == package_id).first()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    if pkg.vendor.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your package")

    db.delete(pkg)
    db.commit()
    return {"ok": True}


@router.get("/mine/list", response_model=list[PackageOut])
def my_packages(
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    profile = db.query(VendorProfile).filter(VendorProfile.user_id == current_user.id).first()
    if not profile:
        return []
    return db.query(Package).filter(Package.vendor_id == profile.id).all()
