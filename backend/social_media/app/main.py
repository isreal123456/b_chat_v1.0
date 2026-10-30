from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from contextlib import asynccontextmanager
from app.dependencies.auth import get_current_user
from app.database.base import Base
from app.database.database import AsyncSessionLocal, engine
from app.routers import (
    admin,
    blocks,
    collaboration,
    discovery,
    friends,
    follows,
    ticks,
    messages,
    notifications,
    platform,
    posts,
    projects,
    reports,
    saves,
    shares,
    users,
    auth,
    comments,
    conversations,
)

from app.core.config import settings
from app.services.feed_cache import close_feed_cache
from app.services.platform_settings import (
    bootstrap_super_admin,
    load_platform_settings,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await bootstrap_super_admin(session)
        app.state.platform_settings = await load_platform_settings(session)
    try:
        yield
    finally:
        await close_feed_cache()


app = FastAPI(title="TickMe API", debug=settings.debug, lifespan=lifespan)


logger = logging.getLogger("tickme")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again."},
    )


@app.get("/", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"message": "TickMe API is running"}


# CORS origins can be configured with CORS_ORIGINS as a comma-separated list.
cors_origins_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

# Keep local dev origins working out of the box.
if not cors_origins:
    cors_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(follows.router)
app.include_router(auth.router)
app.include_router(platform.router)
app.include_router(posts.router)
app.include_router(projects.router)
app.include_router(collaboration.router)
app.include_router(ticks.router)
app.include_router(saves.router)
app.include_router(shares.router)
app.include_router(friends.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(comments.router)
app.include_router(conversations.router)
app.include_router(discovery.router)
app.include_router(blocks.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(notifications.websocket_router)


MAINTENANCE_ALLOWED_PREFIXES = ("/admin", "/auth", "/platform", "/notifications")
MAINTENANCE_ALLOWED_PATHS = {"/", "/users/me", "/docs", "/redoc", "/openapi.json"}


@app.middleware("http")
async def maintenance_guard(request: Request, call_next):
    platform_state = getattr(request.app.state, "platform_settings", None)
    if platform_state and platform_state.get("maintenance_mode"):
        path = request.url.path
        allowed = (
            path in MAINTENANCE_ALLOWED_PATHS
            or path.startswith(MAINTENANCE_ALLOWED_PREFIXES)
            or path.endswith("/avatar")
            or path.endswith("/cover")
        )
        if request.method != "OPTIONS" and not allowed:
            return JSONResponse(
                status_code=503,
                content={
                    "detail": platform_state.get("maintenance_message")
                    or "TickMe is getting an upgrade. Please check back soon.",
                    "maintenance": True,
                },
            )
    return await call_next(request)


@app.get("/profile")
async def profile(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
    }
