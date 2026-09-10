from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.models.models import Package, User, VendorProfile
from app.schemas.schemas import PackageOut, VendorProfileCreate, VendorProfileOut

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorProfileOut])
def list_vendors(
    city: Optional[str] = None,
    cuisine: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db),
):
    query = db.query(VendorProfile)
    if city:
        query = query.filter(VendorProfile.city.ilike(f"%{city}%"))
    if cuisine:
        query = query.filter(VendorProfile.cuisine_types.ilike(f"%{cuisine}%"))
    if min_price is not None:
        query = query.filter(VendorProfile.price_per_plate_max >= min_price)
    if max_price is not None:
        query = query.filter(VendorProfile.price_per_plate_min <= max_price)
    return query.order_by(VendorProfile.avg_rating.desc()).all()


@router.get("/top", response_model=list[VendorProfileOut])
def top_vendors(limit: int = 6, db: Session = Depends(get_db)):
    return (
        db.query(VendorProfile)
        .order_by(VendorProfile.avg_rating.desc(), VendorProfile.rating_count.desc())
        .limit(limit)
        .all()
    )


@router.get("/me", response_model=VendorProfileOut)
def my_vendor_profile(
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    profile = db.query(VendorProfile).filter(VendorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No vendor profile yet")
    return profile


@router.post("/me", response_model=VendorProfileOut)
def upsert_my_vendor_profile(
    payload: VendorProfileCreate,
    current_user: User = Depends(require_role("vendor")),
    db: Session = Depends(get_db),
):
    profile = db.query(VendorProfile).filter(VendorProfile.user_id == current_user.id).first()
    if profile:
        for field, value in payload.model_dump().items():
            setattr(profile, field, value)
    else:
        profile = VendorProfile(user_id=current_user.id, **payload.model_dump())
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{vendor_id}", response_model=VendorProfileOut)
def get_vendor(vendor_id: str, db: Session = Depends(get_db)):
    profile = db.query(VendorProfile).filter(VendorProfile.id == vendor_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return profile


@router.get("/{vendor_id}/packages", response_model=list[PackageOut])
def get_vendor_packages(vendor_id: str, db: Session = Depends(get_db)):
    return (
        db.query(Package)
        .filter(Package.vendor_id == vendor_id, Package.is_active.is_(True))
        .all()
    )
