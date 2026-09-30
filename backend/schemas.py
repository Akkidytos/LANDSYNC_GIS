from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: str = ""
    department: str = ""
    status: str = "ACTIVE"

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "CITIZEN"
    phone: str = ""
    department: str = ""

    @field_validator("role")
    @classmethod
    def role_valid(cls, v):
        if v not in ("ADMIN", "OFFICER", "CITIZEN"):
            raise ValueError("Invalid role")
        return v


class ParcelIn(BaseModel):
    ulpin: str
    survey_number: Optional[str] = ""
    khasra_number: Optional[str] = ""
    owner_name: str
    guardian_name: Optional[str] = ""
    ownership_type: Optional[str] = "SOLE"
    ownership_share: Optional[str] = "100%"
    state: str
    district: str
    tehsil: Optional[str] = ""
    village: str
    locality: Optional[str] = ""
    pin_code: Optional[str] = ""
    area: float
    area_unit: Optional[str] = "sq m"
    land_use: str
    property_type: Optional[str] = "RESIDENTIAL"
    latitude: float
    longitude: float
    geometry_geojson: Optional[str] = None
    ror_number: Optional[str] = ""
    ror_status: Optional[str] = "PENDING"
    registration_number: Optional[str] = ""
    registration_date: Optional[str] = ""
    registration_status: Optional[str] = "PENDING"
    encumbrance_status: Optional[str] = "NONE"
    mortgage_status: Optional[str] = "NONE"
    encumbrance_details: Optional[str] = ""
    master_plan_zone: Optional[str] = ""
    zoning: Optional[str] = ""
    development_restriction: Optional[str] = "NONE"
    building_permission_status: Optional[str] = "NOT_APPLIED"
    approval_number: Optional[str] = ""
    approval_date: Optional[str] = ""
    property_tax_id: Optional[str] = ""
    tax_status: Optional[str] = "PENDING"
    tax_amount: Optional[float] = 0
    last_payment_date: Optional[str] = ""
    utilities: Optional[str] = ""
    environmental_restrictions: Optional[str] = ""
    infrastructure: Optional[str] = ""
    valuation_reference: Optional[str] = ""
    notes: Optional[str] = ""

    @field_validator("ulpin")
    @classmethod
    def ulpin_not_empty(cls, v):
        if not v or len(v.strip()) < 4:
            raise ValueError("ULPIN must be at least 4 characters")
        return v.strip()

    @field_validator("area")
    @classmethod
    def area_positive(cls, v):
        if v <= 0:
            raise ValueError("Area must be positive")
        return v


class ServiceRequestIn(BaseModel):
    service_type: str
    description: str
    parcel_id: Optional[str] = None


class RequestStatusUpdate(BaseModel):
    status: str
    remarks: Optional[str] = ""
    assigned_officer_id: Optional[str] = None


class AssignUserIn(BaseModel):
    user_email: str
    relationship_type: Optional[str] = "OWNER"
