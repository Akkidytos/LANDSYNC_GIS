from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, auth
from utils.audit import verify_chain

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def list_audit(
    page: int = 1, page_size: int = 50, entity_id: str = None,
    db: Session = Depends(get_db), user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER")),
):
    q = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc())
    if entity_id:
        q = q.filter(models.AuditLog.entity_id == entity_id)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"success": True, "data": {
        "total": total,
        "items": [{
            "id": e.id, "timestamp": e.timestamp.isoformat(), "user_email": e.user_email,
            "action": e.action, "entity": e.entity, "entity_id": e.entity_id,
            "details": e.details, "previous_hash": e.previous_hash, "current_hash": e.current_hash,
        } for e in items],
    }}


@router.get("/verify")
def verify(db: Session = Depends(get_db), user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER"))):
    ok, bad_id = verify_chain(db)
    return {"success": True, "data": {"valid": ok, "tampered_event_id": bad_id}}
