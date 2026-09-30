import random
import json
from database import SessionLocal, Base, engine
import models
import auth

random.seed(42)

STATES = {
    "Himachal Pradesh": {"districts": ["Shimla", "Kangra"], "center": (31.7, 77.1)},
    "Uttarakhand": {"districts": ["Dehradun", "Nainital"], "center": (30.3, 78.4)},
    "Punjab": {"districts": ["Amritsar", "Ludhiana"], "center": (31.1, 75.3)},
    "Haryana": {"districts": ["Gurugram", "Panipat"], "center": (29.0, 76.5)},
    "Rajasthan": {"districts": ["Jaipur", "Udaipur"], "center": (26.9, 74.8)},
    "Gujarat": {"districts": ["Ahmedabad", "Surat"], "center": (22.7, 72.5)},
    "Maharashtra": {"districts": ["Pune", "Nagpur"], "center": (19.0, 74.0)},
    "Karnataka": {"districts": ["Bengaluru Urban", "Mysuru"], "center": (13.0, 77.5)},
    "West Bengal": {"districts": ["Kolkata", "Darjeeling"], "center": (22.9, 88.4)},
    "Tamil Nadu": {"districts": ["Chennai", "Madurai"], "center": (13.0, 80.2)},
}
TEHSILS = ["Central", "North", "South", "Rural"]
VILLAGES = ["Rampur", "Shantipur", "Govindpura", "Lakshmipuram", "Devnagar", "Chandpur"]
LAND_USE = ["RESIDENTIAL", "AGRICULTURAL", "COMMERCIAL", "INDUSTRIAL", "MIXED_USE", "INSTITUTIONAL"]
OWNERS = ["Rahul Sharma", "Priya Verma", "Amit Singh", "Sunita Devi", "Vikram Rao", "Anjali Patel",
          "Suresh Kumar", "Meena Gupta", "Rajesh Nair", "Kavita Joshi"]
REG_STATUS = ["VERIFIED", "PENDING", "APPROVED"]
ENCUMBRANCE = ["NONE", "NONE", "NONE", "MORTGAGE", "DISPUTE"]


def square_polygon(lat, lng, size=0.002):
    coords = [
        [lng - size, lat - size], [lng + size, lat - size],
        [lng + size, lat + size], [lng - size, lat + size], [lng - size, lat - size],
    ]
    return json.dumps({"type": "Polygon", "coordinates": [coords]})


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.query(models.User).count() > 0:
        print("Already seeded, skipping.")
        return

    admin = models.User(name="System Admin", email="admin@landsync.demo", role="ADMIN",
                         password_hash=auth.hash_password("Demo@123"), department="IT")
    officer = models.User(name="Field Officer", email="officer@landsync.demo", role="OFFICER",
                           password_hash=auth.hash_password("Demo@123"), department="Revenue")
    citizen = models.User(name="Demo Citizen", email="citizen@landsync.demo", role="CITIZEN",
                           password_hash=auth.hash_password("Demo@123"))
    db.add_all([admin, officer, citizen])
    db.commit()

    count = 0
    parcels = []
    for state, info in STATES.items():
        for i in range(8):  # 10 states * 8 = 80 parcels
            district = random.choice(info["districts"])
            lat = info["center"][0] + random.uniform(-0.5, 0.5)
            lng = info["center"][1] + random.uniform(-0.5, 0.5)
            count += 1
            ulpin = f"ULPIN{state[:2].upper()}{1000+count}"
            p = models.Parcel(
                ulpin=ulpin,
                survey_number=f"SY-{100+count}",
                khasra_number=f"KH-{200+count}",
                owner_name=random.choice(OWNERS),
                guardian_name="S/o " + random.choice(OWNERS),
                ownership_type="SOLE",
                ownership_share="100%",
                state=state, district=district, tehsil=random.choice(TEHSILS),
                village=random.choice(VILLAGES), locality="Sector " + str(random.randint(1, 20)),
                pin_code=str(100000 + count),
                area=round(random.uniform(200, 5000), 2), area_unit="sq m",
                land_use=random.choice(LAND_USE), property_type="INDIVIDUAL",
                latitude=lat, longitude=lng, geometry_geojson=square_polygon(lat, lng),
                ror_number=f"ROR-{count}", ror_status=random.choice(["VERIFIED", "PENDING"]),
                registration_number=f"REG-{count}", registration_date="2023-01-15",
                registration_status=random.choice(REG_STATUS),
                encumbrance_status=random.choice(ENCUMBRANCE), mortgage_status="NONE",
                master_plan_zone="Zone " + random.choice(["A", "B", "C"]), zoning=random.choice(LAND_USE),
                development_restriction="NONE",
                building_permission_status=random.choice(["APPROVED", "NOT_APPLIED", "PENDING"]),
                approval_number=f"BP-{count}", approval_date="2023-03-20",
                property_tax_id=f"TAX-{count}", tax_status=random.choice(["PAID", "PENDING"]),
                tax_amount=round(random.uniform(500, 5000), 2), last_payment_date="2024-06-01",
                utilities="Water, Electricity", environmental_restrictions="None",
                infrastructure="Road access", valuation_reference=f"VAL-{count}",
                notes="Demo synthetic record for prototype purposes.",
                is_demo=True,
            )
            db.add(p)
            parcels.append(p)
    db.commit()

    # Assign a few parcels to the demo citizen
    for p in parcels[:3]:
        db.add(models.ParcelUserAccess(parcel_id=p.id, user_id=citizen.id, relationship_type="OWNER"))
    db.commit()
    print(f"Seeded {count} parcels and 3 demo users.")
    db.close()


if __name__ == "__main__":
    run()
