import hashlib
import datetime as dt
from sqlalchemy.orm import Session
import models


def _hash(previous_hash, timestamp, user, action, entity, details):
    raw = f"{previous_hash}|{timestamp}|{user}|{action}|{entity}|{details}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def log_event(db: Session, user, action: str, entity: str, entity_id: str = None, details: str = ""):
    last = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).first()
    previous_hash = last.current_hash if last else "GENESIS"
    ts = dt.datetime.utcnow().isoformat()
    user_id = getattr(user, "id", None)
    user_email = getattr(user, "email", "system")
    current_hash = _hash(previous_hash, ts, user_email, action, entity, details)
    event = models.AuditLog(
        timestamp=dt.datetime.fromisoformat(ts),
        user_id=user_id,
        user_email=user_email,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details,
        previous_hash=previous_hash,
        current_hash=current_hash,
    )
    db.add(event)
    db.commit()
    return event


def verify_chain(db: Session):
    events = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.asc()).all()
    previous_hash = "GENESIS"
    for e in events:
        expected = _hash(previous_hash, e.timestamp.isoformat(), e.user_email, e.action, e.entity, e.details)
        if e.previous_hash != previous_hash or e.current_hash != expected:
            return False, e.id
        previous_hash = e.current_hash
    return True, None
