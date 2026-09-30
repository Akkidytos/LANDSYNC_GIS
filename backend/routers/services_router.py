import random
import string
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from utils.audit import log_event

router = APIRouter(prefix="/api/services", tags=["services"])

SERVICE_TYPES = [
    "Land Information Request", "Record Correction Request", "Ownership Information Request",
    "Registration Status Request", "Encumbrance Information Request",
    "Property Tax Information Request", "Building Permission Information Request", "General Land Query",
]


def gen_code():
    return "REQ" + "".join(random.choices(string.digits, k=8))


@router.get("")
def list_service_types():
    return {"success": True, "data": SERVICE_TYPES}


@router.get("/requests")
def list_requests(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    q = db.query(models.ServiceRequest)
    if user.role == "CITIZEN":
        q = q.filter(models.ServiceRequest.user_id == user.id)
    items = q.order_by(models.ServiceRequest.created_at.desc()).all()
    out = []
    for r in items:
        officer = db.query(models.User).filter(models.User.id == r.assigned_officer_id).first() if r.assigned_officer_id else None
        out.append({
            "id": r.id, "request_code": r.request_code, "service_type": r.service_type,
            "description": r.description, "status": r.status, "parcel_id": r.parcel_id,
            "assigned_officer": officer.name if officer else None,
            "created_at": r.created_at.isoformat(), "updated_at": r.updated_at.isoformat(),
        })
    return {"success": True, "data": out}


@router.get("/requests/{request_id}")
def get_request(request_id: str, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    r = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Request not found"})
    if user.role == "CITIZEN" and r.user_id != user.id:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Not your request"})
    history = db.query(models.RequestHistory).filter(models.RequestHistory.request_id == request_id).order_by(models.RequestHistory.created_at).all()
    return {"success": True, "data": {
        "id": r.id, "request_code": r.request_code, "service_type": r.service_type,
        "description": r.description, "status": r.status,
        "history": [{"action": h.action, "remarks": h.remarks, "at": h.created_at.isoformat()} for h in history],
    }}


@router.post("/requests")
def create_request(payload: schemas.ServiceRequestIn, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    r = models.ServiceRequest(
        request_code=gen_code(), user_id=user.id, parcel_id=payload.parcel_id,
        service_type=payload.service_type, description=payload.description,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    db.add(models.RequestHistory(request_id=r.id, user_id=user.id, action="SUBMITTED", remarks="Request created"))
    db.commit()
    log_event(db, user, "CREATE_REQUEST", "ServiceRequest", r.id, r.service_type)
    return {"success": True, "data": {"id": r.id, "request_code": r.request_code, "status": r.status}}


@router.put("/requests/{request_id}")
def update_request(
    request_id: str, payload: schemas.RequestStatusUpdate, db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER")),
):
    r = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Request not found"})
    r.status = payload.status
    if payload.assigned_officer_id:
        r.assigned_officer_id = payload.assigned_officer_id
    r.updated_at = dt.datetime.utcnow()
    db.commit()
    db.add(models.RequestHistory(request_id=r.id, user_id=user.id, action=f"STATUS_{payload.status}", remarks=payload.remarks or ""))
    db.commit()
    log_event(db, user, "UPDATE_REQUEST", "ServiceRequest", r.id, f"status={payload.status}")
    return {"success": True, "data": {"message": "Request updated"}}
