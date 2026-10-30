"""TickMe admin console API."""

from fastapi import APIRouter

from app.routers.admin import (
    analytics,
    content,
    overview,
    projects,
    reports,
    settings,
    users,
)

router = APIRouter(prefix="/admin", tags=["admin"])

router.include_router(overview.router)
router.include_router(analytics.router)
router.include_router(users.router)
router.include_router(content.router)
router.include_router(projects.router)
router.include_router(reports.router)
router.include_router(settings.router)

__all__ = ["router"]
