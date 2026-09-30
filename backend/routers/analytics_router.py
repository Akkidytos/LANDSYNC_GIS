import datetime as dt
from collections import Counter
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
import models, auth

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

PERIOD_DAYS = {"DAY": 1, "WEEK": 7, "MONTH": 30, "YEAR": 365, "ALL_TIME": None}


@router.get("")
def analytics(period: str = Query("MONTH"), db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    parcels = db.query(models.Parcel).filter(models.Parcel.deleted_at.is_(None)).all()
    total_area = sum(p.area or 0 for p in parcels)
    verified = sum(1 for p in parcels if p.registration_status == "VERIFIED" or p.registration_status == "APPROVED")
    pending = sum(1 for p in parcels if p.registration_status == "PENDING")
    encumbered = sum(1 for p in parcels if p.encumbrance_status not in ("NONE", None, ""))
    requests = db.query(models.ServiceRequest).all()
    active_requests = sum(1 for r in requests if r.status not in ("COMPLETED", "REJECTED"))
    completed_requests = sum(1 for r in requests if r.status == "COMPLETED")

    def dist(field):
        return dict(Counter(getattr(p, field) or "UNKNOWN" for p in parcels))

    kpis = {
        "total_parcels": len(parcels), "verified_parcels": verified, "pending_records": pending,
        "encumbered_parcels": encumbered, "total_land_area": round(total_area, 2),
        "active_requests": active_requests, "completed_requests": completed_requests,
    }
    charts = {
        "land_use_distribution": dist("land_use"),
        "parcel_status": dist("registration_status"),
        "state_distribution": dist("state"),
        "district_distribution": dist("district"),
        "registration_status": dist("registration_status"),
        "encumbrance_status": dist("encumbrance_status"),
        "property_tax_status": dist("tax_status"),
        "building_approval_status": dist("building_permission_status"),
        "citizen_services": dict(Counter(r.service_type for r in requests)),
    }

    days = PERIOD_DAYS.get(period.upper(), 30)
    now = dt.datetime.utcnow()
    if days:
        cur_start = now - dt.timedelta(days=days)
        prev_start = now - dt.timedelta(days=2 * days)
        cur_parcels = sum(1 for p in parcels if p.created_at and p.created_at >= cur_start)
        prev_parcels = sum(1 for p in parcels if p.created_at and prev_start <= p.created_at < cur_start)
        cur_requests = sum(1 for r in requests if r.created_at and r.created_at >= cur_start)
        prev_requests = sum(1 for r in requests if r.created_at and prev_start <= r.created_at < cur_start)
    else:
        cur_parcels, prev_parcels = len(parcels), 0
        cur_requests, prev_requests = len(requests), 0

    comparison = {
        "period": period.upper(),
        "current": {"new_parcels": cur_parcels, "service_requests": cur_requests},
        "previous": {"new_parcels": prev_parcels, "service_requests": prev_requests},
    }
    return {"success": True, "data": {"kpis": kpis, "charts": charts, "comparison": comparison}}
