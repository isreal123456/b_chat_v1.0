"""Public platform status used by the client shell."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.platform_settings import load_platform_settings

router = APIRouter(prefix="/platform", tags=["platform"])

PUBLIC_KEYS = (
    "maintenance_mode",
    "maintenance_message",
    "registration_enabled",
    "require_email_verification",
    "reports_enabled",
)


@router.get("/status")
async def platform_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    runtime = getattr(request.app.state, "platform_settings", None)
    values = runtime or await load_platform_settings(db)
    return {key: values.get(key) for key in PUBLIC_KEYS}
