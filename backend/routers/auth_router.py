import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models, schemas, auth
from utils.audit import log_event

router = APIRouter(prefix="/api/auth", tags=["auth"])
class RegisterRequest(BaseModel):
    name: str
    username: str
    password: str
    role: str



@router.post("/login")
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password"})
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail={"code": "USER_INACTIVE", "message": "Account is deactivated"})
    user.last_login = dt.datetime.utcnow()
    db.commit()
    token = auth.create_token(user)
    log_event(db, user, "LOGIN", "User", user.id)
    return {"success": True, "data": {"token": token, "user": schemas.UserOut.from_orm(user)}}



@router.post("/register")
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db)
):
    import re

    name = payload.name.strip()
    username = payload.username.strip().lower()
    password = payload.password
    role = payload.role.strip().upper()

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Full name is required."
        )

    if not re.fullmatch(
        r"[a-zA-Z0-9._-]{3,30}",
        username
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid username format."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters."
        )

    if role not in (
        "ADMIN",
        "OFFICER",
        "CITIZEN"
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid role."
        )

    # Existing authentication is email based.
    # A username account gets a private internal identity.
    email = f"{username}@landsync.local"

    existing = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Username already exists."
        )

    user = models.User(
        name=name,
        email=email,
        role=role,
        password_hash=auth.hash_password(password),
        status="ACTIVE"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(
        db,
        user,
        "REGISTER",
        "User",
        user.id
    )

    return {
        "success": True,
        "data": {
            "username": username,
            "user": schemas.UserOut.from_orm(user),
            "message": "Account created successfully."
        }
    }

@router.get("/me")
def me(user: models.User = Depends(auth.get_current_user)):
    return {"success": True, "data": schemas.UserOut.from_orm(user)}


@router.post("/logout")
def logout(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    log_event(db, user, "LOGOUT", "User", user.id)
    return {"success": True, "data": {"message": "Logged out"}}

