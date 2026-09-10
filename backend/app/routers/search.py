from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.models import Package, VendorProfile
from app.schemas.schemas import PackageWithVendorOut, VendorProfileOut

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search(
    q: str = "",
    location: Optional[str] = None,
    mode: str = "vendors",  # "vendors" | "packages"
    db: Session = Depends(get_db),
):
    if mode == "packages":
        query = db.query(Package).options(joinedload(Package.vendor)).join(VendorProfile).filter(
            Package.is_active.is_(True)
        )
        if q:
            query = query.filter(Package.title.ilike(f"%{q}%"))
        if location:
            query = query.filter(VendorProfile.city.ilike(f"%{location}%"))
        results = query.limit(30).all()
        return [PackageWithVendorOut.model_validate(r) for r in results]

    query = db.query(VendorProfile)
    if q:
        query = query.filter(
            VendorProfile.business_name.ilike(f"%{q}%") | VendorProfile.cuisine_types.ilike(f"%{q}%")
        )
    if location:
        query = query.filter(VendorProfile.city.ilike(f"%{location}%"))
    results = query.limit(30).all()
    return [VendorProfileOut.model_validate(r) for r in results]
