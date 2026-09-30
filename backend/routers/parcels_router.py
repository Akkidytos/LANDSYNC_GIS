import json
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
import models, schemas, auth
from utils.audit import log_event

router = APIRouter(prefix="/api/parcels", tags=["parcels"])


def accessible_parcel_ids(db: Session, user: models.User):
    if user.role in ("ADMIN", "OFFICER"):
        return None  # None = no restriction
    rows = db.query(models.ParcelUserAccess.parcel_id).filter(models.ParcelUserAccess.user_id == user.id).all()
    return [r[0] for r in rows]


def parcel_to_dict(p: models.Parcel):
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    for k in ("created_at", "updated_at", "deleted_at"):
        if d.get(k):
            d[k] = d[k].isoformat()
    return d


@router.get("")
def list_parcels(
    page: int = 1, page_size: int = 20,
    db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.Parcel).filter(models.Parcel.deleted_at.is_(None))
    ids = accessible_parcel_ids(db, user)
    if ids is not None:
        q = q.filter(models.Parcel.id.in_(ids)) if ids else q.filter(False)
    total = q.count()
    items = q.order_by(models.Parcel.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"success": True, "data": {"items": [parcel_to_dict(p) for p in items], "total": total, "page": page, "page_size": page_size}}


@router.get("/search")
def search_parcels(q: str = Query(...), db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    like = f"%{q.lower()}%"
    query = db.query(models.Parcel).filter(
        models.Parcel.deleted_at.is_(None),
        or_(
            models.Parcel.ulpin.ilike(like),
            models.Parcel.owner_name.ilike(like),
            models.Parcel.survey_number.ilike(like),
            models.Parcel.khasra_number.ilike(like),
            models.Parcel.state.ilike(like),
            models.Parcel.district.ilike(like),
            models.Parcel.tehsil.ilike(like),
            models.Parcel.village.ilike(like),
        ),
    )
    ids = accessible_parcel_ids(db, user)
    if ids is not None:
        query = query.filter(models.Parcel.id.in_(ids)) if ids else query.filter(False)
    results = query.limit(25).all()
    if not results:
        return {"success": True, "data": {"items": [], "message": "No parcel found matching your search."}}
    return {"success": True, "data": {"items": [parcel_to_dict(p) for p in results]}}


@router.get("/geojson")
def parcels_geojson(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    q = db.query(models.Parcel).filter(models.Parcel.deleted_at.is_(None))
    ids = accessible_parcel_ids(db, user)
    if ids is not None:
        q = q.filter(models.Parcel.id.in_(ids)) if ids else q.filter(False)
    features = []
    for p in q.all():
        try:
            geom = json.loads(p.geometry_geojson) if p.geometry_geojson else {
                "type": "Point", "coordinates": [p.longitude, p.latitude]
            }
        except Exception:
            geom = {"type": "Point", "coordinates": [p.longitude, p.latitude]}
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": p.id, "ulpin": p.ulpin, "owner": p.owner_name,
                "state": p.state, "district": p.district, "village": p.village,
                "land_use": p.land_use, "status": p.registration_status,
                "area": p.area, "area_unit": p.area_unit,
                "latitude": p.latitude, "longitude": p.longitude,
            },
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/{parcel_id}")
def get_parcel(parcel_id: str, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    p = db.query(models.Parcel).filter(models.Parcel.id == parcel_id, models.Parcel.deleted_at.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Parcel not found"})
    ids = accessible_parcel_ids(db, user)
    if ids is not None and p.id not in ids:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Not authorized for this parcel"})
    return {"success": True, "data": parcel_to_dict(p)}


@router.post("")
def create_parcel(
    payload: schemas.ParcelIn, db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER")),
):
    existing = db.query(models.Parcel).filter(models.Parcel.ulpin == payload.ulpin).first()
    if existing:
        raise HTTPException(status_code=409, detail={"code": "DUPLICATE_ULPIN", "message": "ULPIN already exists"})
    p = models.Parcel(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    log_event(db, user, "CREATE_PARCEL", "Parcel", p.id, f"ulpin={p.ulpin}")
    return {"success": True, "data": parcel_to_dict(p)}


@router.put("/{parcel_id}")
def update_parcel(
    parcel_id: str, payload: schemas.ParcelIn, db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER")),
):
    p = db.query(models.Parcel).filter(models.Parcel.id == parcel_id, models.Parcel.deleted_at.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Parcel not found"})
    dup = db.query(models.Parcel).filter(models.Parcel.ulpin == payload.ulpin, models.Parcel.id != parcel_id).first()
    if dup:
        raise HTTPException(status_code=409, detail={"code": "DUPLICATE_ULPIN", "message": "ULPIN already exists"})
    changes = []
    for k, v in payload.model_dump().items():
        old = getattr(p, k)
        if old != v:
            changes.append(f"{k}: {old} -> {v}")
            setattr(p, k, v)
    p.updated_at = dt.datetime.utcnow()
    db.commit()
    log_event(db, user, "UPDATE_PARCEL", "Parcel", p.id, "; ".join(changes)[:500])
    return {"success": True, "data": parcel_to_dict(p)}


@router.delete("/{parcel_id}")
def delete_parcel(
    parcel_id: str, reason: str = "Not specified", db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles("ADMIN")),
):
    p = db.query(models.Parcel).filter(models.Parcel.id == parcel_id, models.Parcel.deleted_at.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Parcel not found"})
    p.deleted_at = dt.datetime.utcnow()
    p.deleted_by = user.id
    p.deletion_reason = reason
    db.commit()
    log_event(db, user, "DELETE_PARCEL", "Parcel", p.id, reason)
    return {"success": True, "data": {"message": "Parcel deleted"}}


@router.post("/{parcel_id}/assign-user")
def assign_user(
    parcel_id: str, payload: schemas.AssignUserIn, db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER")),
):
    p = db.query(models.Parcel).filter(models.Parcel.id == parcel_id, models.Parcel.deleted_at.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Parcel not found"})
    target = db.query(models.User).filter(models.User.email == payload.user_email).first()
    if not target:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "User not found"})
    exists = db.query(models.ParcelUserAccess).filter(
        models.ParcelUserAccess.parcel_id == parcel_id, models.ParcelUserAccess.user_id == target.id
    ).first()
    if not exists:
        acc = models.ParcelUserAccess(parcel_id=parcel_id, user_id=target.id, relationship_type=payload.relationship_type)
        db.add(acc)
        db.commit()
    log_event(db, user, "ASSIGN_PARCEL", "Parcel", parcel_id, f"assigned to {target.email}")
    return {"success": True, "data": {"message": "Parcel assigned"}}


@router.delete("/{parcel_id}/assign-user/{user_id}")
def unassign_user(
    parcel_id: str, user_id: str, db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER")),
):
    acc = db.query(models.ParcelUserAccess).filter(
        models.ParcelUserAccess.parcel_id == parcel_id, models.ParcelUserAccess.user_id == user_id
    ).first()
    if acc:
        db.delete(acc)
        db.commit()
        log_event(db, user, "UNASSIGN_PARCEL", "Parcel", parcel_id, f"removed user {user_id}")
    return {"success": True, "data": {"message": "Association removed"}}
