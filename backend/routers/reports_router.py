import io
import csv
import json
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from database import get_db
import models, auth
from utils.audit import log_event
from routers.parcels_router import accessible_parcel_ids

router = APIRouter(prefix="/api/reports", tags=["reports"])

CSV_FIELDS = [
    "ulpin", "owner_name", "guardian_name", "state", "district", "tehsil", "village",
    "survey_number", "khasra_number", "area", "area_unit", "land_use",
    "ror_status", "registration_status", "encumbrance_status", "building_permission_status", "tax_status",
]


def _authorized_parcels(db: Session, user: models.User, parcel_id: str = None):
    ids = accessible_parcel_ids(db, user)
    q = db.query(models.Parcel).filter(models.Parcel.deleted_at.is_(None))
    if parcel_id:
        q = q.filter(models.Parcel.id == parcel_id)
        if ids is not None and parcel_id not in ids:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Not authorized for this parcel"})
    elif ids is not None:
        q = q.filter(models.Parcel.id.in_(ids)) if ids else q.filter(False)
    return q.all()


def _record_report(db, user, report_type, fmt, count):
    r = models.Report(generated_by=user.id, report_type=report_type, format=fmt, record_count=count)
    db.add(r)
    db.commit()
    log_event(db, user, "GENERATE_REPORT", "Report", r.id, f"{report_type}/{fmt}, records={count}")
    log_event(db, user, "EXPORT_DATA", "Report", r.id, f"{fmt} export, records={count}")


@router.get("/my-report")
def my_report(fmt: str = Query("json"), db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    parcels = _authorized_parcels(db, user)
    return _build_response(db, user, parcels, "USER_LAND_RECORDS", fmt)


@router.get("/parcel/{parcel_id}")
def parcel_report(parcel_id: str, fmt: str = Query("json"), db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    parcels = _authorized_parcels(db, user, parcel_id)
    if not parcels:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Parcel not found"})
    return _build_response(db, user, parcels, "PARCEL_REPORT", fmt)


@router.get("/history")
def report_history(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    rows = db.query(models.Report).filter(models.Report.generated_by == user.id).order_by(models.Report.generated_at.desc()).all()
    return {"success": True, "data": [{
        "id": r.id, "report_type": r.report_type, "format": r.format,
        "record_count": r.record_count, "generated_at": r.generated_at.isoformat(),
    } for r in rows]}


def _build_response(db, user, parcels, report_type, fmt):
    fmt = fmt.lower()
    _record_report(db, user, report_type, fmt, len(parcels))
    if fmt == "json":
        payload = {
            "application": "LandSync", "report_type": report_type,
            "generated_at": dt.datetime.utcnow().isoformat(),
            "generated_for": {"user_id": user.id, "name": user.name, "email": user.email},
            "parcels": [{
                "ulpin": p.ulpin, "owner": p.owner_name, "state": p.state, "district": p.district,
                "village": p.village, "area": p.area, "unit": p.area_unit, "land_use": p.land_use,
                "ror_status": p.ror_status, "registration_status": p.registration_status,
                "encumbrance_status": p.encumbrance_status,
            } for p in parcels],
        }
        buf = io.BytesIO(json.dumps(payload, indent=2).encode("utf-8"))
        return StreamingResponse(buf, media_type="application/json",
                                  headers={"Content-Disposition": "attachment; filename=landsync_report.json"})
    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for p in parcels:
            writer.writerow({f: getattr(p, f) for f in CSV_FIELDS})
        out = io.BytesIO(buf.getvalue().encode("utf-8"))
        return StreamingResponse(out, media_type="text/csv",
                                  headers={"Content-Disposition": "attachment; filename=landsync_report.csv"})
    if fmt == "pdf":
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = [
            Paragraph("<b>LANDSYNC</b>", styles["Title"]),
            Paragraph("Integrated GIS-Based Digital Land Governance System", styles["Normal"]),
            Spacer(1, 12),
            Paragraph(f"Report Type: {report_type}", styles["Normal"]),
            Paragraph(f"Generated For: {user.name} ({user.email})", styles["Normal"]),
            Paragraph(f"Generated At: {dt.datetime.utcnow().isoformat()}", styles["Normal"]),
            Spacer(1, 12),
        ]
        data = [["ULPIN", "Owner", "Location", "Area", "Land Use", "Status"]]
        for p in parcels:
            data.append([p.ulpin, p.owner_name, f"{p.village}, {p.district}", f"{p.area} {p.area_unit}", p.land_use, p.registration_status])
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B2447")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Demo / Synthetic Data — Not an Official Land Record", styles["Italic"]))
        doc.build(elements)
        buf.seek(0)
        return StreamingResponse(buf, media_type="application/pdf",
                                  headers={"Content-Disposition": "attachment; filename=landsync_report.pdf"})
    raise HTTPException(status_code=400, detail={"code": "INVALID_FORMAT", "message": "Format must be json, csv or pdf"})
