import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import Base, engine
import models
from routers import auth_router, parcels_router, users_router, services_router, audit_router, analytics_router, reports_router, documents_router

Base.metadata.create_all(bind=engine)

from routers.ai_router import router as ai_router

app = FastAPI(title="LandSync API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


app.include_router(ai_router)

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"success": False, "error": {"code": "SERVER_ERROR", "message": str(exc)}})


app.include_router(auth_router.router)
app.include_router(parcels_router.router)
app.include_router(users_router.router)
app.include_router(services_router.router)
app.include_router(audit_router.router)
app.include_router(analytics_router.router)
app.include_router(reports_router.router)
app.include_router(documents_router.router)


@app.get("/")
def root():
    return {"success": True, "data": {"message": "LandSync API running"}}


@app.get("/api/health")
def health():
    return {"success": True, "data": {"status": "ok"}}

from routers import reports_premium_router
app.include_router(reports_premium_router.router)

