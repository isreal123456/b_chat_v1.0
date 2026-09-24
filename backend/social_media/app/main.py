from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.dependencies.auth import get_current_user
from app.database.base import Base
from app.database.database import engine
from app.routers import friends, likes, messages, notifications, posts, saves, users, auth, comments, conversations

from app.core.config import settings

app = FastAPI(title=settings.app_name, debug=settings.debug)


@app.get("/", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"message": "Social Media API is running"}
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

@app.on_event("startup")
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(likes.router)
app.include_router(saves.router)
app.include_router(friends.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(comments.router)
app.include_router(conversations.router)
app.include_router(notifications.websocket_router)


@app.get("/profile")
async def profile(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
    }
