from fastapi import APIRouter
from app.api.routes import auth, gateway, logs, admin

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(gateway.router)
api_router.include_router(logs.router)
api_router.include_router(admin.router)
