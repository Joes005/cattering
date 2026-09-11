from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import require_admin
from app.db.database import get_db
from app.models.models import User, UserStatus
from app.schemas.schemas import UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/{user_id}/suspend", response_model=UserOut)
def suspend_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    log_action(db, admin.id, "user_suspended", "user", user.id, old_value={"status": user.status.value})
    user.status = UserStatus.suspended
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/activate", response_model=UserOut)
def activate_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    log_action(db, admin.id, "user_activated", "user", user.id, old_value={"status": user.status.value})
    user.status = UserStatus.active
    db.commit()
    db.refresh(user)
    return user
