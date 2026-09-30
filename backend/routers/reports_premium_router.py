from io import BytesIO, StringIO
import csv
import json
import datetime as dt

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from sqlalchemy.orm import Session

from database import get_db
import models
import auth
from utils.audit import log_event

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)


router = APIRouter(
    prefix="/api/reports-premium",
    tags=["reports-premium"],
)


NAVY = colors.HexColor("#123B5D")
NAVY_DARK = colors.HexColor("#082F54")
SAFFRON = colors.HexColor("#F59E0B")
GREEN = colors.HexColor("#138808")
BLUE = colors.HexColor("#2563EB")
LIGHT_BLUE = colors.HexColor("#EFF6FF")
LIGHT_GREEN = colors.HexColor("#F0FDF4")
LIGHT_AMBER = colors.HexColor("#FFFBEB")
BORDER = colors.HexColor("#D9E2EA")
TEXT = colors.HexColor("#29455D")
MUTED = colors.HexColor("#718397")
WHITE = colors.white


def accessible_query(db: Session, user: models.User):
    q = db.query(models.Parcel).filter(
        models.Parcel.deleted_at.is_(None)
    )

    if user.role in ("ADMIN", "OFFICER"):
        return q

    rows = (
        db.query(models.ParcelUserAccess.parcel_id)
        .filter(models.ParcelUserAccess.user_id == user.id)
        .all()
    )

    ids = [row[0] for row in rows]

    if not ids:
        return q.filter(False)

    return q.filter(models.Parcel.id.in_(ids))


def first_value(obj, *names, default="—"):
    for name in names:
        value = getattr(obj, name, None)
        if value is not None and str(value).strip() != "":
            return value
    return default


def iso_value(value):
    if value is None:
        return "—"

    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()

    return str(value)


def parcel_dict(parcel):
    return {
        "id": iso_value(first_value(parcel, "id")),
        "ulpin": first_value(parcel, "ulpin"),
        "owner": first_value(parcel, "owner_name", "owner"),
        "guardian": first_value(parcel, "father_name", "guardian"),
        "ownership_type": first_value(parcel, "ownership_type"),
        "ownership_share": first_value(parcel, "ownership_share"),
        "state": first_value(parcel, "state"),
        "district": first_value(parcel, "district"),
        "tehsil": first_value(parcel, "tehsil"),
        "village": first_value(parcel, "village"),
        "locality": first_value(parcel, "locality"),
        "address": first_value(parcel, "address"),
        "pin_code": first_value(parcel, "pin_code", "pincode"),
        "survey_number": first_value(parcel, "survey_number"),
        "khasra_number": first_value(parcel, "khasra_number"),
        "area": first_value(parcel, "area"),
        "area_unit": first_value(parcel, "area_unit", "unit"),
        "land_use": first_value(parcel, "land_use"),
        "property_type": first_value(parcel, "property_type"),
        "ror_number": first_value(parcel, "ror_number"),
        "ror_status": first_value(parcel, "ror_status"),
        "registration_number": first_value(parcel, "registration_number"),
        "registration_date": iso_value(
            getattr(parcel, "registration_date", None)
        ),
        "registration_status": first_value(
            parcel, "registration_status"
        ),
        "encumbrance_status": first_value(
            parcel, "encumbrance_status"
        ),
        "mortgage_status": first_value(
            parcel, "mortgage_status"
        ),
        "encumbrance_details": first_value(
            parcel, "encumbrance_details"
        ),
        "master_plan_zone": first_value(
            parcel, "master_plan_zone"
        ),
        "zoning": first_value(parcel, "zoning"),
        "planning_status": first_value(
            parcel, "planning_status"
        ),
        "development_restriction": first_value(
            parcel, "development_restriction"
        ),
        "building_status": first_value(
            parcel, "building_status"
        ),
        "approval_number": first_value(
            parcel, "approval_number"
        ),
        "approval_date": iso_value(
            getattr(parcel, "approval_date", None)
        ),
        "tax_id": first_value(parcel, "tax_id"),
        "tax_status": first_value(parcel, "tax_status"),
        "tax_amount": first_value(parcel, "tax_amount"),
        "latitude": first_value(parcel, "latitude"),
        "longitude": first_value(parcel, "longitude"),
        "notes": first_value(parcel, "notes"),
        "status": first_value(parcel, "status"),
        "created_at": iso_value(
            getattr(parcel, "created_at", None)
        ),
        "updated_at": iso_value(
            getattr(parcel, "updated_at", None)
        ),
    }


def user_scoped_query(
    db: Session,
    user: models.User,
    target_user_id: str | None = None,
):
    # Normal report: respect the logged-in user's normal access scope.
    if not target_user_id:
        return accessible_query(db, user)

    target_id = str(target_user_id).strip()

    # Only ADMIN/OFFICER may generate a report for another user.
    if user.role not in ("ADMIN", "OFFICER") and target_id != str(user.id):
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to generate another user's report.",
        )

    target_user = (
        db.query(models.User)
        .filter(models.User.id == target_id)
        .first()
    )

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="Selected user was not found.",
        )

    # SINGLE-USER REPORT:
    # Always restrict to parcels explicitly associated with the selected user.
    # Do NOT use ADMIN/OFFICER broad-access logic here.
    rows = (
        db.query(models.ParcelUserAccess.parcel_id)
        .filter(models.ParcelUserAccess.user_id == target_id)
        .all()
    )

    ids = [row[0] for row in rows]

    if not ids:
        return db.query(models.Parcel).filter(False)

    return (
        db.query(models.Parcel)
        .filter(
            models.Parcel.deleted_at.is_(None),
            models.Parcel.id.in_(ids),
        )
    )
def filtered_records(
    db: Session,
    user: models.User,
    parcel_id: str | None = None,
    state: str | None = None,
    land_use: str | None = None,
    target_user_id: str | None = None,
):
    q = user_scoped_query(db, user, target_user_id)

    if parcel_id:
        q = q.filter((models.Parcel.id == parcel_id) if str(parcel_id).strip() else (models.Parcel.ulpin == parcel_id))

    if state:
        q = q.filter(models.Parcel.state == state)

    if land_use:
        q = q.filter(models.Parcel.land_use == land_use)

    return q.order_by(models.Parcel.created_at.desc()).all()


def footer(canvas, doc):
    canvas.saveState()

    width, height = A4

    canvas.setStrokeColor(BORDER)
    canvas.line(
        18 * mm,
        15 * mm,
        width - 18 * mm,
        15 * mm,
    )

    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)

    canvas.drawString(
        18 * mm,
        10.5 * mm,
        "LANDSYNC • Demo / Synthetic Data — Not an Official Land Record",
    )

    canvas.drawRightString(
        width - 18 * mm,
        10.5 * mm,
        f"Page {doc.page}",
    )

    canvas.restoreState()


def build_pdf(records, user, report_title):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=23 * mm,
        title=report_title,
        author="LandSync",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=23,
        leading=27,
        textColor=NAVY_DARK,
        alignment=TA_CENTER,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=15,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceAfter=16,
    )

    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=17,
        textColor=NAVY_DARK,
        spaceBefore=10,
        spaceAfter=8,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.7,
        leading=14,
        textColor=TEXT,
    )

    small_style = ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=MUTED,
    )

    story = []

    story.append(
        Table(
            [["LANDSYNC"]],
            colWidths=[174 * mm],
            rowHeights=[13 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), NAVY_DARK),
                ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 18),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]),
        )
    )

    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            "Integrated GIS-Based Digital Land Governance System",
            subtitle_style,
        )
    )

    story.append(
        Paragraph(
            report_title,
            title_style,
        )
    )

    overview = [
        ["Generated For", str(user.name)],
        ["Email", str(user.email)],
        ["Role", str(user.role)],
        [
            "Generated At",
            dt.datetime.now().astimezone().strftime(
                "%d %b %Y, %I:%M %p"
            ),
        ],
        ["Records Included", str(len(records))],
    ]

    overview_table = Table(
        overview,
        colWidths=[48 * mm, 118 * mm],
    )

    overview_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), LIGHT_BLUE),
            ("TEXTCOLOR", (0, 0), (0, -1), NAVY),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("TEXTCOLOR", (1, 0), (1, -1), TEXT),
            ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 8),
        ])
    )

    story.append(overview_table)
    story.append(Spacer(1, 14))

    story.append(
        Table(
            [[
                Paragraph(
                    "This report is generated from LandSync prototype data. "
                    "Records are synthetic/demo data and are not official "
                    "government land records.",
                    body_style,
                )
            ]],
            colWidths=[166 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_AMBER),
                ("BOX", (0, 0), (-1, -1), 0.7, SAFFRON),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]),
        )
    )

    story.append(PageBreak())

    for index, record in enumerate(records, start=1):
        story.append(
            Paragraph(
                f"Parcel Record {index:02d}",
                section_style,
            )
        )

        identity = [
            ["ULPIN", record["ulpin"]],
            ["Record ID", record["id"]],
            ["Survey Number", record["survey_number"]],
            ["Khasra Number", record["khasra_number"]],
            ["Property Type", record["property_type"]],
            ["Land Use", record["land_use"]],
            [
                "Area",
                f'{record["area"]} {record["area_unit"]}',
            ],
        ]

        ownership = [
            ["Owner", record["owner"]],
            ["Guardian / Father", record["guardian"]],
            ["Ownership Type", record["ownership_type"]],
            ["Ownership Share", record["ownership_share"]],
        ]

        location = [
            ["State", record["state"]],
            ["District", record["district"]],
            ["Tehsil", record["tehsil"]],
            ["Village", record["village"]],
            ["Locality", record["locality"]],
            ["Address", record["address"]],
            ["PIN Code", record["pin_code"]],
            ["Latitude", record["latitude"]],
            ["Longitude", record["longitude"]],
        ]

        ror = [
            ["RoR Number", record["ror_number"]],
            ["RoR Status", record["ror_status"]],
            ["Registration Number", record["registration_number"]],
            ["Registration Date", record["registration_date"]],
            ["Registration Status", record["registration_status"]],
        ]

        governance = [
            ["Encumbrance", record["encumbrance_status"]],
            ["Mortgage", record["mortgage_status"]],
            ["Encumbrance Details", record["encumbrance_details"]],
            ["Master Plan Zone", record["master_plan_zone"]],
            ["Zoning", record["zoning"]],
            ["Planning Status", record["planning_status"]],
            [
                "Development Restriction",
                record["development_restriction"],
            ],
        ]

        building_tax = [
            ["Building Permission", record["building_status"]],
            ["Approval Number", record["approval_number"]],
            ["Approval Date", record["approval_date"]],
            ["Tax ID", record["tax_id"]],
            ["Tax Status", record["tax_status"]],
            ["Tax Amount", record["tax_amount"]],
        ]

        lifecycle = [
            ["Current Status", record["status"]],
            ["Created At", record["created_at"]],
            ["Last Updated", record["updated_at"]],
            ["Notes / Evidence", record["notes"]],
        ]

        sections = [
            ("Parcel Identity", identity, LIGHT_BLUE),
            ("Ownership", ownership, LIGHT_GREEN),
            ("Location", location, colors.HexColor("#F5F3FF")),
            ("Record of Rights & Registration", ror, LIGHT_AMBER),
            ("Encumbrance & Planning", governance, colors.HexColor("#FEF2F2")),
            ("Building & Property Tax", building_tax, colors.HexColor("#ECFEFF")),
            ("Record Lifecycle & Notes", lifecycle, colors.HexColor("#F8FAFC")),
        ]

        for heading, rows, bg in sections:
            story.append(
                Table(
                    [[heading]],
                    colWidths=[166 * mm],
                    style=TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                        ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
                        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 10.5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 9),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]),
                )
            )

            table_data = [
                ["Field", "Value"],
                *[
                    [
                        Paragraph(str(field), body_style),
                        Paragraph(str(value), body_style),
                    ]
                    for field, value in rows
                ],
            ]

            table = Table(
                table_data,
                colWidths=[52 * mm, 114 * mm],
                repeatRows=1,
            )

            table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), bg),
                    ("TEXTCOLOR", (0, 0), (-1, 0), NAVY_DARK),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                        WHITE,
                        colors.HexColor("#FAFCFD"),
                    ]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ])
            )

            story.append(table)
            story.append(Spacer(1, 8))

        story.append(
            Paragraph(
                "GIS Reference",
                section_style,
            )
        )

        story.append(
            Paragraph(
                f'Parcel location reference: '
                f'Latitude {record["latitude"]}, '
                f'Longitude {record["longitude"]}.',
                body_style,
            )
        )

        if index < len(records):
            story.append(PageBreak())

    doc.build(
        story,
        onFirstPage=footer,
        onLaterPages=footer,
    )

    buffer.seek(0)
    return buffer


def _apply_single_parcel_filter(query, parcel_id):
    if not parcel_id:
        return query
    value = str(parcel_id).strip()
    if value.isdigit():
        return query.filter(models.Parcel.id == value)
    return query.filter(models.Parcel.ulpin == value)

@router.get("/pdf")
def detailed_pdf(
    parcel_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    state: str | None = Query(default=None),
    land_use: str | None = Query(default=None),
    report_type: str = Query(default="Detailed Land Parcel Report"),
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    parcels = filtered_records(
        db,
        user,
        parcel_id=parcel_id,
        state=state,
        land_use=land_use,
        target_user_id=(user_id if user.role in ('ADMIN', 'OFFICER') else str(user.id)),
    )

    records = [parcel_dict(p) for p in parcels]

    if not records:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": {
                    "code": "NO_RECORDS",
                    "message": "No authorized records matched the report filters.",
                },
            },
        )

    pdf = build_pdf(records, user, report_type)

    audit_details = (
        f"format=PDF, report_type={report_type}, records={len(records)}, parcel_id={parcel_id or 'ALL'}"
    )
    log_event(db, user, "GENERATE_REPORT", "Report", parcel_id, audit_details)
    log_event(db, user, "EXPORT_DATA", "Report", parcel_id, audit_details)

    filename = (
        "LandSync_Detailed_Report.pdf"
        if not parcel_id
        else "LandSync_Parcel_Dossier.pdf"
    )

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.get("/json")
def detailed_json(
    parcel_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    state: str | None = Query(default=None),
    land_use: str | None = Query(default=None),
    report_type: str = Query(default="Detailed Land Parcel Report"),
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    parcels = filtered_records(
        db,
        user,
        parcel_id=parcel_id,
        state=state,
        land_use=land_use,
        target_user_id=(user_id if user.role in ('ADMIN', 'OFFICER') else str(user.id)),
    )

    records = [parcel_dict(p) for p in parcels]

    return {
        "success": True,
        "data": {
            "application": "LandSync",
            "report_type": report_type,
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "generated_for": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
            "record_count": len(records),
            "records": records,
        },
    }


@router.get("/csv")
def detailed_csv(
    parcel_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    state: str | None = Query(default=None),
    land_use: str | None = Query(default=None),
    report_type: str = Query(default="Detailed Land Parcel Report"),
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    parcels = filtered_records(
        db,
        user,
        parcel_id=parcel_id,
        state=state,
        land_use=land_use,
        target_user_id=(user_id if user.role in ('ADMIN', 'OFFICER') else str(user.id)),
    )

    rows = [parcel_dict(p) for p in parcels]

    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=list(rows[0].keys()) if rows else [
            "ulpin",
            "owner",
            "state",
        ],
    )

    writer.writeheader()

    for row in rows:
        writer.writerow(row)

    content = "\ufeff" + output.getvalue()

    audit_details = (
        f"format=CSV, report_type={report_type}, records={len(rows)}, parcel_id={parcel_id or 'ALL'}"
    )
    log_event(db, user, "GENERATE_REPORT", "Report", parcel_id, audit_details)
    log_event(db, user, "EXPORT_DATA", "Report", parcel_id, audit_details)

    return StreamingResponse(
        iter([content.encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="LandSync_Detailed_Report.csv"'
        },
    )






