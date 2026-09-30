from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from utils.audit import log_event
from routers.parcels_router import parcel_to_dict

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/parcels")
def my_parcels(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    if user.role in ("ADMIN", "OFFICER"):
        parcels = db.query(models.Parcel).filter(models.Parcel.deleted_at.is_(None)).all()
    else:
        ids = [r[0] for r in db.query(models.ParcelUserAccess.parcel_id).filter(models.ParcelUserAccess.user_id == user.id).all()]
        parcels = db.query(models.Parcel).filter(models.Parcel.id.in_(ids), models.Parcel.deleted_at.is_(None)).all() if ids else []
    return {"success": True, "data": [parcel_to_dict(p) for p in parcels]}


@router.get("")
def list_users(db: Session = Depends(get_db), user: models.User = Depends(auth.require_roles("ADMIN"))):
    users = db.query(models.User).all()
    out = []
    for u in users:
        count = db.query(models.ParcelUserAccess).filter(models.ParcelUserAccess.user_id == u.id).count()
        out.append({**schemas.UserOut.from_orm(u).model_dump(), "associated_parcels": count,
                    "last_login": u.last_login.isoformat() if u.last_login else None})
    return {"success": True, "data": out}


@router.post("")
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db), user: models.User = Depends(auth.require_roles("ADMIN"))):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail={"code": "DUPLICATE_EMAIL", "message": "Email already registered"})
    u = models.User(
        name=payload.name, email=payload.email, role=payload.role,
        phone=payload.phone, department=payload.department,
        password_hash=auth.hash_password(payload.password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    log_event(db, user, "CREATE_USER", "User", u.id, f"email={u.email}, role={u.role}")
    return {"success": True, "data": schemas.UserOut.from_orm(u)}


@router.put("/{user_id}")
def update_user(user_id: str, payload: dict, db: Session = Depends(get_db), user: models.User = Depends(auth.require_roles("ADMIN"))):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found"})
    for field in ("name", "role", "phone", "department", "status"):
        if field in payload:
            setattr(target, field, payload[field])
    if payload.get("password"):
        target.password_hash = auth.hash_password(payload["password"])
    db.commit()
    log_event(db, user, "UPDATE_USER", "User", target.id, str(payload))
    return {"success": True, "data": schemas.UserOut.from_orm(target)}


@router.put("/{user_id}/profile")
def update_own_profile(user_id: str, payload: dict, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    if user.id != user_id and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Cannot edit another user's profile"})
    target = db.query(models.User).filter(models.User.id == user_id).first()
    for field in ("name", "phone"):
        if field in payload:
            setattr(target, field, payload[field])
    db.commit()
    return {"success": True, "data": schemas.UserOut.from_orm(target)}
