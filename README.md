# LandSync — Integrated GIS-Based Digital Land Governance System

Prototype/academic implementation. All parcel data is **synthetic demo data** —
not an official land record, not a government system.

## Stack

- **Backend:** FastAPI, SQLAlchemy, JWT auth, bcrypt, reportlab (PDF)
- **Database:** SQLite by default (zero setup). `DATABASE_URL` can point to
  PostgreSQL/PostGIS instead — the schema uses lat/lng + a GeoJSON text
  column for parcel geometry (not a native PostGIS geometry column yet),
  which keeps the same code path working on both engines. Swapping in a
  real `geoalchemy2` Geometry column and spatial indexes is the natural
  next step if you move this past prototype scale.
- **Frontend:** React + TypeScript + Vite, Leaflet/react-leaflet (GIS map),
  Recharts (analytics), i18next (English/Hindi)

## What's implemented and tested

- JWT auth, RBAC enforced server-side (ADMIN / OFFICER / CITIZEN)
- Land Registry: add/edit/soft-delete parcels, ULPIN uniqueness, full field set
- Search (ULPIN, owner, survey/khasra no., state/district/tehsil/village)
- Interactive Leaflet map: OSM basemap, real parcel polygons via `/api/parcels/geojson`,
  search → fly-to → highlight → popup → details, layer toggle, legend, Fit-India control
- User-specific land records (`/api/users/me/parcels`) with per-user RBAC
- Citizen service requests: submit, track, officer status updates + history
- Reports: PDF / JSON / CSV, all scoped to the requester's authorized records
- Analytics: DB-driven KPIs and charts, day/week/month/year period comparison
- SHA-256 hash-chained audit log + chain verification endpoint
- English/Hindi UI switch covering navigation, dashboard, registry, map, parcel
  details, services, reports, analytics, audit and settings (parcel *data* is
  never translated, only UI labels)
- Document/evidence upload per parcel (PDF/JPG/PNG, 10 MB limit, type-validated,
  RBAC-checked, download + delete, audited) with a Documents panel on the
  Parcel Details page
- Per-parcel audit history panel (Admin/Officer) on Parcel Details
- Docker/Nginx/Postgres-PostGIS compose setup

## Known scope limits (be aware before treating this as feature-complete)

- Hindi coverage is comprehensive for the labels above but not exhaustively
  audited string-by-string against every possible UI microcopy.
- No automated test suite yet (backend logic was smoke-tested manually —
  see below).
- `docker-compose.yml` was written to the spec but not run inside this
  sandbox (no Docker daemon available here) — run `docker compose up --build`
  yourself to confirm on your machine; SQLite-mode was fully run and verified.

## Run locally without Docker

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py            # creates landsync.db with 80 demo parcels + 3 users
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

Frontend:
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

## Run with Docker (Postgres + PostGIS)

```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs

## Demo accounts (password: `Demo@123`)

| Role    | Email                    |
|---------|--------------------------|
| Admin   | admin@landsync.demo      |
| Officer | officer@landsync.demo    |
| Citizen | citizen@landsync.demo    |

## API summary

See `/docs` (Swagger) once the backend is running — every endpoint from the
spec (`/api/auth/*`, `/api/parcels/*`, `/api/users/*`, `/api/services/*`,
`/api/reports/*`, `/api/analytics`, `/api/audit/*`) is live.
