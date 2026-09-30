import uuid
import datetime as dt
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from database import Base


def uid():
    return str(uuid.uuid4())


def now():
    return dt.datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="CITIZEN")  # ADMIN, OFFICER, CITIZEN
    phone = Column(String, default="")
    department = Column(String, default="")
    status = Column(String, default="ACTIVE")  # ACTIVE, INACTIVE
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now)


class Parcel(Base):
    __tablename__ = "parcels"
    id = Column(String, primary_key=True, default=uid)
    ulpin = Column(String, unique=True, nullable=False, index=True)
    survey_number = Column(String, index=True)
    khasra_number = Column(String, index=True)

    owner_name = Column(String, index=True)
    guardian_name = Column(String)
    ownership_type = Column(String)
    ownership_share = Column(String)

    state = Column(String, index=True)
    district = Column(String, index=True)
    tehsil = Column(String, index=True)
    village = Column(String, index=True)
    locality = Column(String)
    pin_code = Column(String)

    area = Column(Float)
    area_unit = Column(String, default="sq m")
    land_use = Column(String)
    property_type = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    geometry_geojson = Column(Text)  # GeoJSON polygon string (synthetic)

    ror_number = Column(String)
    ror_status = Column(String, default="PENDING")
    registration_number = Column(String)
    registration_date = Column(String)
    registration_status = Column(String, default="PENDING")

    encumbrance_status = Column(String, default="NONE")
    mortgage_status = Column(String, default="NONE")
    encumbrance_details = Column(Text, default="")

    master_plan_zone = Column(String)
    zoning = Column(String)
    development_restriction = Column(String, default="NONE")

    building_permission_status = Column(String, default="NOT_APPLIED")
    approval_number = Column(String)
    approval_date = Column(String)

    property_tax_id = Column(String)
    tax_status = Column(String, default="PENDING")
    tax_amount = Column(Float, default=0)
    last_payment_date = Column(String)

    utilities = Column(String, default="")
    environmental_restrictions = Column(String, default="")
    infrastructure = Column(String, default="")
    valuation_reference = Column(String, default="")
    notes = Column(Text, default="")

    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(String, nullable=True)
    deletion_reason = Column(String, nullable=True)


class ParcelUserAccess(Base):
    __tablename__ = "parcel_user_access"
    id = Column(String, primary_key=True, default=uid)
    parcel_id = Column(String, ForeignKey("parcels.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    relationship_type = Column(String, default="OWNER")
    created_at = Column(DateTime, default=now)


class ParcelDocument(Base):
    __tablename__ = "parcel_documents"
    id = Column(String, primary_key=True, default=uid)
    parcel_id = Column(String, ForeignKey("parcels.id"), index=True)
    filename = Column(String)
    stored_path = Column(String)
    file_type = Column(String)
    category = Column(String, default="OTHER")
    size_bytes = Column(Integer, default=0)
    uploaded_by = Column(String, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=now)


class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id = Column(String, primary_key=True, default=uid)
    request_code = Column(String, unique=True)
    user_id = Column(String, ForeignKey("users.id"))
    parcel_id = Column(String, ForeignKey("parcels.id"), nullable=True)
    service_type = Column(String)
    description = Column(Text)
    status = Column(String, default="SUBMITTED")
    assigned_officer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)


class RequestHistory(Base):
    __tablename__ = "request_history"
    id = Column(String, primary_key=True, default=uid)
    request_id = Column(String, ForeignKey("service_requests.id"))
    user_id = Column(String)
    action = Column(String)
    remarks = Column(Text, default="")
    created_at = Column(DateTime, default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=uid)
    timestamp = Column(DateTime, default=now)
    user_id = Column(String, nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String)
    entity = Column(String)
    entity_id = Column(String, nullable=True)
    details = Column(Text, default="")
    previous_hash = Column(String)
    current_hash = Column(String)


class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, default=uid)
    generated_by = Column(String, ForeignKey("users.id"))
    report_type = Column(String)
    format = Column(String)
    filters = Column(Text, default="")
    record_count = Column(Integer, default=0)
    generated_at = Column(DateTime, default=now)
