from __future__ import annotations
from pathlib import Path
import threading
import uuid

import re

import datetime as dt
import json
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
import auth
import models

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ============================================================
# AI_HISTORY_PERSISTENCE_V1
# ============================================================

AI_HISTORY_FILE = Path(__file__).resolve().parent.parent / "data" / "ai_history.json"
AI_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
AI_HISTORY_LOCK = threading.Lock()

def _history_read():
    with AI_HISTORY_LOCK:
        try:
            if not AI_HISTORY_FILE.exists():
                return {"conversations": []}
            raw = AI_HISTORY_FILE.read_text(encoding="utf-8")
            return json.loads(raw) if raw.strip() else {"conversations": []}
        except Exception:
            return {"conversations": []}

def _history_write(data):
    with AI_HISTORY_LOCK:
        tmp = AI_HISTORY_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(AI_HISTORY_FILE)

def _history_user_id(user):
    return str(getattr(user, "id", ""))

def _history_get_owned(data, user, conversation_id):
    uid = _history_user_id(user)
    for item in data.get("conversations", []):
        if item.get("id") == conversation_id and str(item.get("user_id")) == uid:
            return item
    return None

@router.post("/conversations")
def create_ai_conversation(user: models.User = Depends(auth.get_current_user)):
    now = dt.datetime.utcnow().isoformat()
    item = {
        "id": str(uuid.uuid4()),
        "user_id": _history_user_id(user),
        "title": "New LandSync chat",
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }
    data = _history_read()
    data.setdefault("conversations", []).insert(0, item)
    _history_write(data)
    return {"success": True, "data": item}

@router.get("/conversations")
def list_ai_conversations(user: models.User = Depends(auth.get_current_user)):
    data = _history_read()
    uid = _history_user_id(user)
    rows = []
    for x in data.get("conversations", []):
        if str(x.get("user_id")) == uid:
            rows.append({
                "id": x.get("id"),
                "title": x.get("title") or "New LandSync chat",
                "created_at": x.get("created_at"),
                "updated_at": x.get("updated_at"),
                "message_count": len(x.get("messages") or []),
            })
    rows.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    return {"success": True, "data": rows}

@router.get("/conversations/{conversation_id}")
def get_ai_conversation(conversation_id: str, user: models.User = Depends(auth.get_current_user)):
    data = _history_read()
    item = _history_get_owned(data, user, conversation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True, "data": item}

@router.post("/conversations/{conversation_id}/messages")
def add_ai_history_message(
    conversation_id: str,
    payload: dict,
    user: models.User = Depends(auth.get_current_user),
):
    role = str(payload.get("role") or "").strip().lower()
    content = str(payload.get("content") or "").strip()
    if role not in {"user", "assistant"}:
        raise HTTPException(status_code=400, detail="Invalid message role")
    if not content:
        raise HTTPException(status_code=400, detail="Message content is required")

    data = _history_read()
    item = _history_get_owned(data, user, conversation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = dt.datetime.utcnow().isoformat()
    item.setdefault("messages", []).append({
        "id": str(uuid.uuid4()),
        "role": role,
        "content": content,
        "created_at": now,
    })
    item["messages"] = item["messages"][-200:]

    if role == "user" and item.get("title") in (None, "", "New LandSync chat"):
        clean = re.sub(r"\s+", " ", content).strip()
        item["title"] = (clean[:54] + "…") if len(clean) > 55 else clean

    item["updated_at"] = now
    _history_write(data)
    return {"success": True, "data": item}

@router.delete("/conversations/{conversation_id}")
def delete_ai_conversation(
    conversation_id: str,
    user: models.User = Depends(auth.get_current_user),
):
    data = _history_read()
    uid = _history_user_id(user)
    before = len(data.get("conversations", []))
    data["conversations"] = [
        x for x in data.get("conversations", [])
        if not (x.get("id") == conversation_id and str(x.get("user_id")) == uid)
    ]
    if len(data["conversations"]) == before:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _history_write(data)
    return {"success": True, "data": {"message": "Conversation deleted"}}


AI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()


class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    previous_response_id: str | None = None
    language: str = "auto"
    context: dict[str, Any] | str | None = None


def serialise(value: Any) -> Any:
    if isinstance(value, (dt.datetime, dt.date, dt.time)):
        return value.isoformat()
    if hasattr(value, "quantize"):
        return float(value)
    if isinstance(value, dict):
        return {k: serialise(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialise(v) for v in value]
    return value


def model_dict(instance: Any, limit: int | None = None) -> dict[str, Any]:
    if not instance:
        return {}
    data: dict[str, Any] = {}
    table = getattr(instance, "__table__", None)
    columns = list(getattr(table, "columns", [])) if table is not None else []
    if limit:
        columns = columns[:limit]
    for column in columns:
        name = column.name
        try:
            data[name] = serialise(getattr(instance, name))
        except Exception:
            data[name] = None
    return data


def accessible_parcels(db: Session, user: models.User):
    query = db.query(models.Parcel).filter(models.Parcel.deleted_at.is_(None))
    if user.role == "CITIZEN":
        query = query.join(
            models.ParcelUserAccess,
            models.ParcelUserAccess.parcel_id == models.Parcel.id,
        ).filter(models.ParcelUserAccess.user_id == user.id)
    return query


def parcel_summary(parcel: models.Parcel) -> dict[str, Any]:
    raw = model_dict(parcel)
    keep = [
        "id", "ulpin", "owner_name", "guardian_name", "father_name", "ownership_type",
        "ownership_share", "state", "district", "tehsil", "village", "locality", "pin_code",
        "survey_number", "khasra_number", "area", "area_unit", "land_use", "property_type",
        "latitude", "longitude", "ror_number", "ror_status", "registration_number",
        "registration_date", "registration_status", "encumbrance_status", "mortgage_status",
        "master_plan_zone", "zoning", "development_restriction", "building_permission_status",
        "approval_number", "approval_date", "property_tax_id", "tax_status", "tax_amount",
        "last_payment_date", "utilities", "environmental_restrictions", "infrastructure",
        "valuation_reference", "notes", "is_demo", "created_at", "updated_at",
    ]
    result = {k: raw.get(k) for k in keep if k in raw}
    result["demo_notice"] = bool(raw.get("is_demo", True))
    return result


def request_model():
    for name in ("ServiceRequest", "CitizenServiceRequest", "ServiceRequestModel"):
        candidate = getattr(models, name, None)
        if candidate is not None and hasattr(candidate, "__table__"):
            return candidate
    return None


def audit_model():
    for name in ("AuditLog", "AuditEvent", "Audit"):
        candidate = getattr(models, name, None)
        if candidate is not None and hasattr(candidate, "__table__"):
            return candidate
    return None


def request_visible(db: Session, user: models.User, item: Any) -> bool:
    if user.role in ("ADMIN", "OFFICER"):
        return True
    raw = model_dict(item)
    for key in ("user_id", "created_by_id", "citizen_id", "requester_id"):
        if raw.get(key) is not None and str(raw.get(key)) == str(user.id):
            return True
    parcel_id = raw.get("parcel_id")
    if parcel_id:
        return accessible_parcels(db, user).filter(models.Parcel.id == parcel_id).first() is not None
    # Do not expose an unlinked request to a citizen unless the row explicitly belongs to them.
    return False


def tool_search_parcels(db: Session, user: models.User, args: dict[str, Any]) -> dict[str, Any]:
    q = str(args.get("query") or "").strip()
    query = accessible_parcels(db, user)
    if q:
        like = f"%{q}%"
        fields = [
            models.Parcel.ulpin,
            models.Parcel.owner_name,
            models.Parcel.survey_number,
            models.Parcel.khasra_number,
            models.Parcel.state,
            models.Parcel.district,
            models.Parcel.tehsil,
            models.Parcel.village,
            models.Parcel.locality,
        ]
        available = [f for f in fields if hasattr(f, "ilike")]
        query = query.filter(or_(*[field.ilike(like) for field in available]))
    if args.get("state"):
        query = query.filter(models.Parcel.state.ilike(f"%{args['state']}%"))
    if args.get("district"):
        query = query.filter(models.Parcel.district.ilike(f"%{args['district']}%"))
    if args.get("land_use"):
        query = query.filter(models.Parcel.land_use.ilike(f"%{args['land_use']}%"))
    limit = max(1, min(int(args.get("max_results") or 8), 12))
    rows = query.order_by(models.Parcel.created_at.desc()).limit(limit).all()
    return {"count": len(rows), "records": [parcel_summary(row) for row in rows]}


def tool_get_parcel(db: Session, user: models.User, args: dict[str, Any]) -> dict[str, Any]:
    query = accessible_parcels(db, user)
    parcel_id = args.get("parcel_id")
    ulpin = args.get("ulpin")
    if parcel_id:
        parcel = query.filter(models.Parcel.id == str(parcel_id)).first()
    elif ulpin:
        parcel = query.filter(models.Parcel.ulpin.ilike(str(ulpin))).first()
    else:
        return {"error": "Provide parcel_id or ulpin."}
    if not parcel:
        return {"found": False, "message": "No accessible parcel matched that identifier."}
    return {"found": True, "record": parcel_summary(parcel)}


def tool_my_parcels(db: Session, user: models.User, args: dict[str, Any]) -> dict[str, Any]:
    query = accessible_parcels(db, user)
    if args.get("land_use"):
        query = query.filter(models.Parcel.land_use.ilike(f"%{args['land_use']}%"))
    rows = query.order_by(models.Parcel.area.desc()).limit(25).all()
    total_area = sum(float(getattr(row, "area", 0) or 0) for row in rows)
    return {
        "count_returned": len(rows),
        "total_area_returned": total_area,
        "area_unit_mix": sorted({str(getattr(row, "area_unit", "")) for row in rows}),
        "records": [parcel_summary(row) for row in rows],
    }


def tool_service_requests(db: Session, user: models.User, args: dict[str, Any]) -> dict[str, Any]:
    cls = request_model()
    if cls is None:
        return {"available": False, "message": "Citizen service request data model is not available in this build."}
    rows = db.query(cls).order_by(getattr(cls, "created_at", cls.id).desc()).limit(120).all()
    visible = [row for row in rows if request_visible(db, user, row)]
    status = str(args.get("status") or "").strip().lower()
    if status:
        visible = [row for row in visible if str(model_dict(row).get("status") or "").lower() == status]
    return {"count": len(visible), "requests": [model_dict(row, limit=32) for row in visible[:25]]}


def tool_service_request(db: Session, user: models.User, args: dict[str, Any]) -> dict[str, Any]:
    cls = request_model()
    if cls is None:
        return {"available": False, "message": "Citizen service request data model is not available in this build."}
    rid = str(args.get("request_id") or "")
    rows = db.query(cls).limit(120).all()
    for row in rows:
        raw = model_dict(row)
        ids = [raw.get(k) for k in ("id", "request_id", "request_code", "code")]
        if rid and any(str(v) == rid for v in ids if v is not None) and request_visible(db, user, row):
            return {"found": True, "request": raw}
    return {"found": False, "message": "No accessible service request matched that identifier."}


def tool_analytics(db: Session, user: models.User, args: dict[str, Any]) -> dict[str, Any]:
    query = accessible_parcels(db, user)
    state = str(args.get("state") or "").strip()
    if state:
        query = query.filter(models.Parcel.state.ilike(f"%{state}%"))
    rows = query.all()
    total_area = sum(float(getattr(p, "area", 0) or 0) for p in rows)

    def counts(field: str) -> dict[str, int]:
        out: dict[str, int] = {}
        for p in rows:
            value = getattr(p, field, None) or "Unknown"
            out[str(value)] = out.get(str(value), 0) + 1
        return dict(sorted(out.items(), key=lambda x: (-x[1], x[0]))[:12])

    result = {
        "parcel_count": len(rows),
        "total_area_sum": total_area,
        "land_use": counts("land_use"),
        "states": counts("state"),
        "registration_status": counts("registration_status"),
        "encumbrance_status": counts("encumbrance_status"),
        "tax_status": counts("tax_status"),
        "building_permission_status": counts("building_permission_status"),
    }
    cls = request_model()
    if cls is not None:
        request_rows = db.query(cls).limit(250).all()
        visible = [r for r in request_rows if request_visible(db, user, r)]
        result["service_requests"] = {
            "total": len(visible),
            "status": counts_from_requests(visible, "status"),
        }
    return result


def counts_from_requests(rows: list[Any], field: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for row in rows:
        value = model_dict(row).get(field) or "Unknown"
        out[str(value)] = out.get(str(value), 0) + 1
    return dict(sorted(out.items(), key=lambda x: (-x[1], x[0]))[:12])


def tool_audit_summary(db: Session, user: models.User, args: dict[str, Any]) -> dict[str, Any]:
    if user.role not in ("ADMIN", "OFFICER"):
        return {"error": "Audit information is restricted to officers and administrators."}
    cls = audit_model()
    if cls is None:
        return {"available": False, "message": "Audit model is not available in this build."}
    limit = max(1, min(int(args.get("last_n") or 12), 30))
    rows = db.query(cls).order_by(getattr(cls, "created_at", cls.id).desc()).limit(limit).all()
    return {"count": len(rows), "events": [model_dict(row, limit=24) for row in rows]}


TOOLS = [
    {
        "type": "function",
        "name": "search_parcels",
        "description": "Search the user's accessible LandSync parcels by ULPIN, owner, survey/khasra number, location or land use. Use this instead of guessing parcel data.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Free-text parcel search."},
                "state": {"type": "string"},
                "district": {"type": "string"},
                "land_use": {"type": "string"},
                "max_results": {"type": "integer"},
            },
            "required": ["query"],
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "get_parcel",
        "description": "Get one accessible parcel's detailed connected record using its database id or ULPIN.",
        "parameters": {
            "type": "object",
            "properties": {
                "parcel_id": {"type": "string"},
                "ulpin": {"type": "string"},
            },
            "required": [],
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "get_my_parcels",
        "description": "List parcels the authenticated user is allowed to see. For a citizen this is limited to linked parcels by backend RBAC.",
        "parameters": {
            "type": "object",
            "properties": {"land_use": {"type": "string"}},
            "required": [],
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "get_service_requests",
        "description": "Get accessible citizen-service requests and their current statuses.",
        "parameters": {
            "type": "object",
            "properties": {"status": {"type": "string"}},
            "required": [],
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "get_service_request",
        "description": "Get one accessible citizen-service request by its id or request code.",
        "parameters": {
            "type": "object",
            "properties": {"request_id": {"type": "string"}},
            "required": ["request_id"],
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "get_analytics",
        "description": "Compute live LandSync parcel and service-request analytics from the authenticated user's accessible data.",
        "parameters": {
            "type": "object",
            "properties": {"state": {"type": "string"}},
            "required": [],
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "get_audit_summary",
        "description": "Get recent audit events. Only available to ADMIN and OFFICER users.",
        "parameters": {
            "type": "object",
            "properties": {"last_n": {"type": "integer"}},
            "required": [],
        },
        "strict": False,
    },
]

SYSTEM_PROMPT = """
You are LandSync Scientist, the intelligent research and analysis assistant embedded inside the LandSync Integrated GIS-Based Digital Land Governance System.

Mission:
- Help citizens, officers and administrators understand, investigate and analyze LandSync.
- Treat the parcel as the central object: One Parcel -> One Digital Identity -> Connected Records -> One Parcel Dashboard.
- Understand natural language, Hindi, English and Hinglish. Follow the user's language and tone.
- Remember earlier turns in the same conversation and resolve references like 'that parcel', 'the Shimla one', 'residential wali', or 'iska status'.
- Use the available LandSync tools for every question that depends on live records. Never invent a parcel, owner, service status, analytics number, ULPIN or audit event.
- The backend enforces access control. Never ask the user for a different user's identifiers to bypass access controls.
- Explain land-record terminology in simple language when asked, including RoR, encumbrance, registration, zoning, property tax and building permission.
- When the user asks many questions at once, decompose the request into separate sub-questions and answer each one. Use multiple tools when required. Do not stop after answering only the first question. For complete-analysis requests, combine parcel, ownership, RoR, registration, encumbrance, zoning, tax, building permission, service-request and analytics information when available. Clearly identify missing, conflicting or attention-needed information instead of guessing.
- For ambiguous parcel references, use search_parcels and ask one concise clarifying question when multiple matches remain. Maintain the meaning of previous turns and resolve references such as "that one", "iska", "us wali", "Shimla wali", or "the previous parcel" using conversation context.
- Be action-oriented: tell the user what screen, report, map, dashboard, document or service in LandSync is relevant. For analytical questions, explain the evidence first and then the practical next step.

Safety and authority:
- LandSync prototype records are demo/synthetic unless explicitly marked otherwise. Do not present them as official government records.
- Never claim that LandSync legally proves ownership, title, mutation, registration validity or government approval.
- When appropriate, say that official authority remains with the relevant government/departments.
- Do not expose restricted admin/officer/audit information to citizens.
- Do not fabricate missing data. Say clearly when the records do not contain an answer.

Response style:
- Start with the answer, then the important supporting details.
- Use short headings and bullets when helpful.
- For a single parcel, surface: ULPIN, owner, location, area, land use, RoR, registration, encumbrance, planning/building and tax status when available.
- When showing demo data, explicitly mention that it is synthetic/demo data.
- Keep normal chat responses compact enough for a side-panel UI, but handle large multi-question requests completely. Use numbered sections matching the user's questions when useful. Do not impose an artificial small question limit.
""".strip()


def _detect_land_use(text: str) -> str | None:
    t = text.lower()
    mapping = {
        "residential": ["residential", "ghar", "housing", "home", "rahne wali"],
        "agricultural": ["agricultural", "agriculture", "kheti", "farm", "farming"],
        "commercial": ["commercial", "shop", "dukaan", "business"],
        "industrial": ["industrial", "factory", "industry"],
        "institutional": ["institutional", "school", "college", "hospital"],
        "mixed_use": ["mixed use", "mixed-use", "mixed"],
    }
    for canonical, words in mapping.items():
        if any(w in t for w in words):
            return canonical
    return None


def _detect_place(text: str) -> str | None:
    places = [
        "shimla", "kangra", "dehradun", "nainital", "amritsar", "ludhiana",
        "gurugram", "panipat", "jaipur", "udaipur", "ahmedabad", "surat",
        "pune", "nagpur", "bengaluru", "mysuru", "kolkata", "darjeeling",
        "chennai", "madurai", "himachal pradesh", "uttarakhand", "punjab",
        "haryana", "rajasthan", "gujarat", "maharashtra", "karnataka",
        "west bengal", "tamil nadu"
    ]
    low = text.lower()
    for p in places:
        if p in low:
            return p
    return None



def _extract_owner_name(text: str) -> str | None:
    t = text.strip()

    patterns = [
        r"^\s*(?:property|land|parcel|plot)\s+(?:of|for)\s+(.+?)\s*$",
        r"^\s*(.+?)\s+(?:ki|ke)\s+(?:property|land|parcel|plot)\s+(?:dikhao|dikhado|batao|show|find|search)\s*$",
        r"^\s*(.+?)\s+(?:ke naam par|ke name par|ke naam pe|ke name pe)\s+(?:kitni|kaunsi|property|land|zameen)",
        r"^\s*(?:kiske naam par|kiske naam pe|kiske name par)\s+(?:property|land|zameen)"
    ]

    for pattern in patterns:
        m = re.search(pattern, t, flags=re.I)
        if m and m.groups():
            name = m.group(1).strip(" ?.,:-")
            if len(name) >= 3 and name.lower() not in {"meri", "my", "property", "land", "parcel"}:
                return name

    # Common direct form: "Rahul Sharma ki property dikhao"
    m = re.search(r"^(.+?)\s+(?:ki|ke)\s+(?:property|land|zameen|parcel|plot)\b", t, flags=re.I)
    if m:
        name = m.group(1).strip(" ?.,:-")
        if len(name) >= 3:
            return name

    return None


def _format_parcel_lines(records: list[dict[str, Any]], limit: int = 6) -> list[str]:
    lines = []
    for rec in records[:limit]:
        loc = ", ".join([str(x) for x in [rec.get("village"), rec.get("district"), rec.get("state")] if x])
        area = f"{rec.get('area','â€”')} {rec.get('area_unit','') or ''}".strip()
        lines.append(
            f"- **{rec.get('ulpin','â€”')}** Â· {rec.get('land_use','â€”')} Â· {area} Â· {loc or 'Location unavailable'}"
        )
    return lines


def offline_answer(message: str, db: Session, user: models.User) -> tuple[str, bool, str]:
    lower = message.lower().strip()

    # LandSync knowledge + natural-language explanation layer
    knowledge = [
        (("what is landsync","landsync kya hai","landsync kya hota hai"),
         "LandSync ek GIS-based digital land governance platform hai jo parcel ko central digital identity banakar GIS, ownership-style records, registration, land use, encumbrance, building permission, property tax aur citizen services ko connect karta hai."),
        (("what is ulpin","ulpin kya hai","ulpin kya hota hai","unique parcel id"),
         "ULPIN-style identity ek unique parcel identifier hota hai jiske through ek land parcel se related spatial aur governance records ko ek common identity ke saath connect kiya ja sakta hai. LandSync mein prototype ULPIN-style identifiers use kiye gaye hain."),
        (("what is ror","ror kya hai","ror kya hota hai","record of rights"),
         "RoR yani Record of Rights parcel se judi rights/holder information ko represent karne wala land-record concept hai. LandSync mein RoR fields prototype records ke saath linked hain; ye official government RoR nahi hain."),
        (("what is encumbrance","encumbrance kya hai","encumbrance kya hota hai","mortgage kya hai"),
         "Encumbrance ka matlab parcel par kisi financial, legal ya recorded burden/restriction ka hona ho sakta hai, jaise mortgage ya dispute-related status. LandSync mein encumbrance status parcel ke governance data ka hissa hai."),
        (("what is gis","gis kya hai","gis kya hota hai","geographic information system"),
         "GIS yani Geographic Information System location-based information ko map par visualize aur analyze karta hai. LandSync mein GIS parcel location, boundaries aur linked land records ko spatial context ke saath dikhata hai."),
        (("what is zoning","zoning kya hai","zoning kya hota hai","land use kya hai"),
         "Land use batata hai parcel ka configured use category kya hai, jaise Residential, Agricultural, Commercial ya Industrial. Zoning planning rules ya designated use information ko represent karti hai."),
        (("what is master plan","master plan kya hai","master plan kya hota hai"),
         "Master Plan ek planning framework hota hai jo kisi area ke future land use, development aur zoning ko guide karta hai. LandSync mein master-plan related fields parcel ke saath linked ho sakte hain."),
        (("what is building permission","building permission kya hai","building approval kya hai","building permission kya hoti hai"),
         "Building permission/approval kisi parcel par construction-related approval status ko represent karti hai. LandSync mein approval status, reference aur related parcel metadata store kiya ja sakta hai."),
        (("what is property tax","property tax kya hai","property tax kya hota hai"),
         "Property tax parcel/property se related fiscal information hai. LandSync prototype mein tax ID, status, amount aur payment-related fields parcel records se connected hain."),
        (("what is audit trail","audit trail kya hai","audit kya hai","audit trail kya hota hai"),
         "Audit trail important system actions ka trace rakhta hai, jaise login, parcel create/update, request update aur report generation. LandSync tamper-evident SHA-256 hash chaining ka prototype use karta hai."),
        (("what is rbac","rbac kya hai","role based access","role based access control"),
         "RBAC yani Role-Based Access Control mein permissions user ke role ke according control hoti hain. LandSync mein ADMIN, OFFICER aur CITIZEN roles ke liye access rules alag hain."),
        (("what is geojson","geojson kya hai","geojson kya hota hai"),
         "GeoJSON geographic features aur geometries ko JSON format mein represent karta hai. LandSync ka GIS backend GeoJSON ke through parcel features frontend map ko provide karta hai."),
        (("what is postgis","postgis kya hai"),
         "PostGIS PostgreSQL ka spatial extension hai jo geographic geometry aur spatial queries support karta hai. LandSync architecture mein parcel geometry ke liye PostGIS use kiya gaya hai."),
        (("what is citizen service","citizen service kya hai","citizen services kya hain"),
         "Citizen Services parcel-linked requests create aur track karne ke liye use hoti hain, jaise Land Information Request, Record Correction, Registration Status, Encumbrance Information aur Property Tax Information."),
        (("service request kaise","service request kaise kare","request kaise submit","application kaise kare"),
         "LandSync mein user Citizen Services se service select karta hai, parcel optionally link karta hai, description submit karta hai aur system request ID generate karta hai. Uske baad request status track kiya ja sakta hai."),
        (("request status kya kya","service status kya kya","request workflow kya hai"),
         "LandSync request workflow mein SUBMITTED, UNDER REVIEW, IN PROGRESS, APPROVED, REJECTED aur COMPLETED jaise statuses support kiye gaye hain."),
        (("report kya hai","reports kya hain","land report kya hai"),
         "LandSync Reports module parcel aur governance information ko PDF, JSON aur CSV formats mein export kar sakta hai. Reports authenticated user ke accessible records ke according generate hote hain."),
        (("demo data kya hai","synthetic data kya hai","is data official hai","kya ye official land record hai"),
         "Nahi. Current LandSync prototype ke records DEMO/SYNTHETIC data hain. Inhe official title, ownership verification, cadastral boundary ya government land record nahi maana jaana chahiye."),
        (("ai kya kar sakta hai","what can you do","tum kya kar sakte ho","aap kya kar sakte ho"),
         "Main LandSync ke context mein parcels, land use, RoR, registration, encumbrance, property tax, building permission, citizen service requests, reports, GIS concepts aur available analytics ko samjha sakta hoon. Main accessible database records ke basis par natural-language questions ka answer bhi de sakta hoon."),
        (("parcel kya hai","land parcel kya hai","parcel kya hota hai"),
         "Parcel ek identifiable land unit hai. LandSync mein parcel central data object hai aur uske saath location, area, ownership-style information, land use, registration, tax, encumbrance aur service records connect kiye jaate hain."),
        (("one parcel one digital identity","one parcel","core principle"),
         "LandSync ka core principle hai: One Parcel → One Digital Identity → Connected Records → One Parcel Dashboard."),
        (("land governance kya hai","digital land governance"),
         "Digital land governance ka matlab land-related records, workflows, maps, services aur audit information ko digital, connected aur traceable form mein manage karna hai."),
        (("gis map mein kya dikhta hai","map mein kya dikhta hai","gis map kya dikhaata hai"),
         "LandSync GIS map parcel locations, parcel boundaries/visual overlays, land-use information aur clickable parcel context provide karta hai. Prototype geometry synthetic ho sakti hai."),
        (("privacy","mera data safe hai","data access kaise","kaun data dekh sakta hai"),
         "LandSync authenticated access aur role-based permissions use karta hai. Citizen ko sirf uske authorized parcel/service records milne chahiye, jabki broader administrative access role ke according controlled hota hai."),
        (("land record mein kya kya hota hai","parcel record mein kya hota hai","record fields"),
         "LandSync parcel record mein ULPIN-style ID, owner-style information, state, district, tehsil, village, survey/khasra, area, land use, RoR, registration, encumbrance, planning, building permission, property tax, notes aur GIS coordinates jaise fields ho sakte hain."),
        (("why landsync","landsync useful kyu hai","landsync ka fayda"),
         "LandSync ka purpose fragmented land information ko parcel-centric view mein connect karna hai, taaki user ko multiple disconnected records ke badle ek common parcel identity ke through related information aur services mil saken."),
        (("how gis and records connected","gis aur records kaise connect","map aur records kaise connect"),
         "LandSync mein parcel ek common integration key ki tarah kaam karta hai. GIS parcel identify karta hai aur usi Parcel ID/ULPIN-style identity ke through backend related governance records retrieve karta hai."),
        (("difference between ror and registration","ror aur registration mein difference","registration aur ror"),
         "RoR rights/holder-related record concept ko represent karta hai, jabki registration transaction/registration-related information ko represent karta hai. Dono alag information domains hain lekin LandSync mein same parcel identity se connect kiye ja sakte hain."),
        (("what is interoperability","interoperability kya hai","interoperability"),
         "Interoperability ka matlab different systems aur datasets ko common APIs, identifiers aur data structures ke through ek doosre ke saath communicate aur exchange karne dena hai. LandSync ka architecture parcel identity ko common anchor banata hai.")
    ]

    for phrases, answer in knowledge:
        if any(phrase in lower for phrase in phrases):
            return answer, False, AI_MODEL

    land_use = _detect_land_use(lower)
    place = _detect_place(lower)
    owner_name = _extract_owner_name(message)

    # Owner-name property lookup
    if owner_name:
        data = tool_search_parcels(
            db,
            user,
            {"query": owner_name, "land_use": land_use, "max_results": 12}
        )
        records = data.get("records") or []

        if not records:
            qualifier = f" with land use **{land_use.replace('_',' ').title()}**" if land_use else ""
            return (
                f"Mujhe aapke accessible LandSync records mein "
                f"**{owner_name}** ke naam se{qualifier} koi parcel nahi mila."
            ), False, AI_MODEL

        heading = f"Properties/land records for **{owner_name}**"
        if land_use:
            heading += f" ? {land_use.replace('_',' ').title()}"

        lines = [f"**{heading}: {len(records)} record(s)**"]
        lines += _format_parcel_lines(records)

        lines.append("")
        lines.append(
            "Ye prototype/demo records hain; ye official ownership or title verification nahi hain."
        )
        return "\n".join(lines), False, AI_MODEL


    # Smart overall LandSync summary
    if any(x in lower for x in (
        "summary", "overall", "overview", "meri land ka summary",
        "meri zameen ka summary", "pura summary", "complete summary",
        "land summary", "records ka summary", "mere records ka summary"
    )):
        parcels = tool_my_parcels(db, user, {}) or {}
        records = parcels.get("records") or []

        if not records:
            return "Aapke accessible LandSync records mein summary ke liye koi parcel nahi mila.", False, AI_MODEL

        land_use_counts = {}
        ror_counts = {}
        registration_counts = {}
        enc_counts = {}
        tax_counts = {}

        for r in records:
            lu = str(r.get("land_use") or "Unknown").replace("_", " ").title()
            land_use_counts[lu] = land_use_counts.get(lu, 0) + 1

            for key, target in [
                ("ror_status", ror_counts),
                ("registration_status", registration_counts),
                ("encumbrance_status", enc_counts),
                ("tax_status", tax_counts),
            ]:
                value = str(r.get(key) or "Unknown").replace("_", " ").title()
                target[value] = target.get(value, 0) + 1

        requests = tool_service_requests(db, user, {}) or {}
        request_rows = requests.get("requests") or []

        lines = [
            "**📊 LandSync Land Summary**",
            f"- Accessible parcels: **{len(records)}**",
            "",
            "**Land use**"
        ]

        for k, v in sorted(land_use_counts.items(), key=lambda x: (-x[1], x[0])):
            lines.append(f"- {k}: **{v}**")

        lines.append("")
        lines.append("**RoR status**")
        for k, v in sorted(ror_counts.items(), key=lambda x: (-x[1], x[0])):
            lines.append(f"- {k}: **{v}**")

        lines.append("")
        lines.append("**Registration**")
        for k, v in sorted(registration_counts.items(), key=lambda x: (-x[1], x[0])):
            lines.append(f"- {k}: **{v}**")

        lines.append("")
        lines.append("**Encumbrance**")
        for k, v in sorted(enc_counts.items(), key=lambda x: (-x[1], x[0])):
            lines.append(f"- {k}: **{v}**")

        lines.append("")
        lines.append("**Property tax**")
        for k, v in sorted(tax_counts.items(), key=lambda x: (-x[1], x[0])):
            lines.append(f"- {k}: **{v}**")

        lines.append("")
        lines.append(f"**Citizen service requests:** {len(request_rows)}")

        if request_rows:
            active = [
                r for r in request_rows
                if str(r.get("status", "")).upper() not in ("COMPLETED", "REJECTED")
            ]
            lines.append(f"- Active requests: **{len(active)}**")

        lines.append("")
        lines.append("Ye prototype/demo records hain; ye official title or ownership verification nahi hain.")

        return "\n".join(lines), False, AI_MODEL
    # Natural-language parcel lookup: "meri land", "meri zameen", "residential land", etc.
    parcel_terms = any(x in lower for x in (
        "meri land", "meri zameen", "mere parcel", "my land", "my parcel", "my parcels",
        "land records", "zameen dikhao", "parcel dikhao", "land dikhao", "records dikhao"
    ))
    if parcel_terms or land_use or place:
        if place and place in ("himachal pradesh", "uttarakhand", "punjab", "haryana", "rajasthan", "gujarat", "maharashtra", "karnataka", "west bengal", "tamil nadu"):
            data = tool_search_parcels(db, user, {"query": place, "land_use": land_use, "max_results": 12})
        elif place:
            data = tool_search_parcels(db, user, {"query": place, "land_use": land_use, "max_results": 12})
        elif land_use:
            data = tool_my_parcels(db, user, {"land_use": land_use})
        else:
            data = tool_my_parcels(db, user, {})
        records = data.get("records") or []
        if not records:
            qualifier = f" for **{land_use.replace('_',' ').title()}**" if land_use else (f" matching **{place.title()}**" if place else "")
            return f"Mujhe aapke accessible LandSync records mein{qualifier} koi parcel nahi mila.", False, AI_MODEL
        heading = "Aapke accessible parcels"
        if land_use:
            heading += f" â€” {land_use.replace('_',' ').title()}"
        if place:
            heading += f" â€” {place.title()}"
        lines = [f"**{heading}: {len(records)} record(s)**"] + _format_parcel_lines(records)
        if len(records) > 6:
            lines.append(f"â€¦aur {len(records)-6} record(s) bhi available hain.")
        lines.append("\nYe prototype/demo records hain; ye official title or ownership verification nahi hain.")
        return "\n".join(lines), False, AI_MODEL

    if any(x in lower for x in ("total area", "kul area", "kitni zameen", "kitna land", "how much land")):
        data = tool_my_parcels(db, user, {})
        if not data.get("records"):
            return "Aapke accessible LandSync records mein koi parcel nahi mila.", False, AI_MODEL
        return (
            f"Aapke accessible records mein **{data['count_returned']} parcels** hain. "
            f"Returned records ka combined area **{data['total_area_returned']:.2f}** hai "
            f"(units mixed ho sakti hain: {', '.join(data['area_unit_mix']) or 'not specified'})."
        ), False, AI_MODEL

    if any(token in lower for token in ("encumbrance", "mortgage", "dispute")):
        data = tool_my_parcels(db, user, {})
        records = data.get("records") or []
        flagged = [r for r in records if str(r.get("encumbrance_status", "")).upper() not in ("", "NONE", "CLEAR")]
        if not flagged:
            return "Aapke accessible parcel records mein koi non-clear encumbrance status nahi mila.", False, AI_MODEL
        lines = [f"**{len(flagged)} parcel(s) mein attention-worthy encumbrance status mila:**"]
        for r in flagged[:8]:
            lines.append(f"- **{r.get('ulpin','â€”')}** â€” {r.get('encumbrance_status','â€”')}")
        return "\n".join(lines), False, AI_MODEL

    if any(token in lower for token in ("tax", "property tax", "tax due")):
        data = tool_my_parcels(db, user, {})
        records = data.get("records") or []
        flagged = [r for r in records if str(r.get("tax_status", "")).upper() not in ("", "PAID", "CLEAR")]
        if not flagged:
            return "Aapke accessible parcel records mein tax-related pending status nahi mila.", False, AI_MODEL
        lines = [f"**{len(flagged)} parcel(s) mein tax attention needed ho sakti hai:**"]
        for r in flagged[:8]:
            lines.append(f"- **{r.get('ulpin','â€”')}** â€” tax status: **{r.get('tax_status','â€”')}**, amount: {r.get('tax_amount','â€”')}")
        return "\n".join(lines), False, AI_MODEL

    if any(x in lower for x in ("service", "application", "request", "pending request", "request status")):
        data = tool_service_requests(db, user, {})
        if data.get("available") is False:
            return "Citizen service data model is not available to the AI in this build.", False, AI_MODEL
        requests = data.get("requests", [])
        if not requests:
            return "Aapke accessible service requests ka koi record nahi mila.", False, AI_MODEL
        lines = [f"Aapke accessible service requests: **{len(requests)}**"]
        for req in requests[:8]:
            code = req.get("request_code", req.get("id", "â€”"))
            service = req.get("service_type", req.get("subject", "Service Request"))
            lines.append(f"- **{code}** â€” {service} â€” **{req.get('status','â€”')}**")
        return "\n".join(lines), False, AI_MODEL

    if any(x in lower for x in ("analytics", "analysis", "summary", "attention", "problematic")):
        data = tool_analytics(db, user, {})
        return (
            f"Live LandSync summary: **{data.get('parcel_count',0)} parcels**, "
            f"land-use breakdown: {json.dumps(data.get('land_use',{}), ensure_ascii=False)}, "
            f"registration: {json.dumps(data.get('registration_status',{}), ensure_ascii=False)}, "
            f"encumbrance: {json.dumps(data.get('encumbrance_status',{}), ensure_ascii=False)}, "
            f"tax: {json.dumps(data.get('tax_status',{}), ensure_ascii=False)}."
        ), False, AI_MODEL

    return ("Main LandSync ke live records se help kar sakta hoon. Aap natural language mein pooch sakte hain, jaise: **meri residential land dikhao**, **Shimla wali land ka status batao**, **mere pending requests dikhao**, ya **kis parcel mein encumbrance hai?**", False, AI_MODEL)


def run_tool(name: str, args: dict[str, Any], db: Session, user: models.User) -> dict[str, Any]:
    handlers = {
        "search_parcels": tool_search_parcels,
        "get_parcel": tool_get_parcel,
        "get_my_parcels": tool_my_parcels,
        "get_service_requests": tool_service_requests,
        "get_service_request": tool_service_request,
        "get_analytics": tool_analytics,
        "get_audit_summary": tool_audit_summary,
    }
    handler = handlers.get(name)
    if handler is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return serialise(handler(db, user, args))
    except Exception as exc:
        return {"error": f"Tool failed safely: {type(exc).__name__}"}


def make_client():
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
    except Exception:
        return None
    kwargs = {"api_key": OPENAI_API_KEY}
    if AI_BASE_URL:
        kwargs["base_url"] = AI_BASE_URL
    return OpenAI(**kwargs)


@router.get("/status")
def ai_status():
    return {
        "success": True,
        "data": {
            "configured": bool(OPENAI_API_KEY),
            "model": AI_MODEL,
            "mode": "live" if OPENAI_API_KEY else "offline-fallback",
        },
    }


@router.post("/chat")
def ai_chat(
    payload: AIChatRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    client = make_client()
    context = payload.context or {}
    context_text = json.dumps(serialise(context), ensure_ascii=False)
    user_text = (
        f"Authenticated user: name={getattr(user, 'name', '')}, email={getattr(user, 'email', '')}, role={getattr(user, 'role', '')}.\n"
        f"Current page context: {context_text}\n"
        f"Preferred language: {payload.language}.\n"
        f"User message:\n{payload.message}"
    )

    if client is None:
        answer, live, model = offline_answer(payload.message, db, user)
        return {"success": True, "data": {"message": answer, "response_id": None, "live_ai": live, "model": model}}

    try:
        response = client.responses.create(
            model=AI_MODEL,
            instructions=SYSTEM_PROMPT,
            input=user_text,
            previous_response_id=payload.previous_response_id or None,
            tools=TOOLS,
            max_output_tokens=2200,
            store=True,
            safety_identifier=str(user.id),
        )

        for _ in range(8):
            calls = [item for item in getattr(response, "output", []) if getattr(item, "type", "") == "function_call"]
            if not calls:
                break
            tool_outputs = []
            for call in calls:
                try:
                    arguments = json.loads(getattr(call, "arguments", "{}") or "{}")
                except json.JSONDecodeError:
                    arguments = {}
                result = run_tool(getattr(call, "name", ""), arguments, db, user)
                tool_outputs.append({
                    "type": "function_call_output",
                    "call_id": getattr(call, "call_id", ""),
                    "output": json.dumps(result, ensure_ascii=False),
                })
            response = client.responses.create(
                model=AI_MODEL,
                instructions=SYSTEM_PROMPT,
                previous_response_id=response.id,
                input=tool_outputs,
                tools=TOOLS,
                max_output_tokens=2200,
                store=True,
                safety_identifier=str(user.id),
            )

        text = (getattr(response, "output_text", "") or "").strip()
        if not text:
            text = "I could not produce a response from the available LandSync records."
        return {
            "success": True,
            "data": {
                "message": text,
                "response_id": response.id,
                "live_ai": True,
                "model": AI_MODEL,
            },
        }
    except Exception as exc:
        # Keep the existing LandSync application available even if the AI provider is unavailable.
        answer = f"AI service temporarily unavailable. I can still help with the LandSync interface, but I won't invent live record data. ({type(exc).__name__})"
        return {
            "success": True,
            "data": {
                "message": answer,
                "response_id": payload.previous_response_id,
                "live_ai": False,
                "model": AI_MODEL,
                "provider_error": True,
            },
        }












