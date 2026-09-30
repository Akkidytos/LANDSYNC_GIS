import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models, auth
from utils.audit import log_event
from routers.parcels_router import accessible_parcel_ids

router = APIRouter(prefix="/api", tags=["documents"])

UPLOAD_ROOT = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "uploads"))
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}
ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


def _check_access(db: Session, user: models.User, parcel_id: str):
    p = db.query(models.Parcel).filter(models.Parcel.id == parcel_id, models.Parcel.deleted_at.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Parcel not found"})
    ids = accessible_parcel_ids(db, user)
    if ids is not None and parcel_id not in ids:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Not authorized for this parcel"})
    return p


@router.post("/parcels/{parcel_id}/documents")
async def upload_document(
    parcel_id: str, category: str = Form("OTHER"), file: UploadFile = File(...),
    db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user),
):
    _check_access(db, user, parcel_id)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT or (file.content_type and file.content_type not in ALLOWED_TYPES):
        raise HTTPException(status_code=400, detail={"code": "INVALID_FILE_TYPE", "message": "Only PDF, JPG and PNG files are allowed"})

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail={"code": "FILE_TOO_LARGE", "message": "File exceeds 10 MB limit"})

    parcel_dir = os.path.join(UPLOAD_ROOT, parcel_id)
    os.makedirs(parcel_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4()}{ext}"
    stored_path = os.path.join(parcel_dir, stored_name)
    with open(stored_path, "wb") as f:
        f.write(contents)

    doc = models.ParcelDocument(
        parcel_id=parcel_id, filename=file.filename, stored_path=stored_path,
        file_type=file.content_type or ext, category=category,
        size_bytes=len(contents), uploaded_by=user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_event(db, user, "UPLOAD_DOCUMENT", "ParcelDocument", doc.id, f"parcel={parcel_id}, file={file.filename}")
    return {"success": True, "data": {
        "id": doc.id, "filename": doc.filename, "category": doc.category,
        "size_bytes": doc.size_bytes, "uploaded_at": doc.uploaded_at.isoformat(),
    }}


@router.get("/parcels/{parcel_id}/documents")
def list_documents(parcel_id: str, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    _check_access(db, user, parcel_id)
    docs = db.query(models.ParcelDocument).filter(models.ParcelDocument.parcel_id == parcel_id).order_by(models.ParcelDocument.uploaded_at.desc()).all()
    return {"success": True, "data": [{
        "id": d.id, "filename": d.filename, "category": d.category, "file_type": d.file_type,
        "size_bytes": d.size_bytes, "uploaded_at": d.uploaded_at.isoformat(),
    } for d in docs]}


@router.get("/documents/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.ParcelDocument).filter(models.ParcelDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Document not found"})
    _check_access(db, user, doc.parcel_id)
    if not os.path.exists(doc.stored_path):
        raise HTTPException(status_code=404, detail={"code": "FILE_MISSING", "message": "Stored file not found on server"})
    return FileResponse(doc.stored_path, filename=doc.filename, media_type=doc.file_type)


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str, db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles("ADMIN", "OFFICER")),
):
    doc = db.query(models.ParcelDocument).filter(models.ParcelDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Document not found"})
    if os.path.exists(doc.stored_path):
        os.remove(doc.stored_path)
    db.delete(doc)
    db.commit()
    log_event(db, user, "DELETE_DOCUMENT", "ParcelDocument", document_id, f"file={doc.filename}")
    return {"success": True, "data": {"message": "Document deleted"}}
