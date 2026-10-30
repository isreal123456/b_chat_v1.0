"""Platform configuration endpoints (super-admin only for writes)."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.admin import require_permission
from app.models.admin_setting import AdminSetting
from app.models.user import User
from app.schemas.admin import AdminSettingsUpdate
from app.services.admin_service import record_admin_action
from app.services.platform_settings import (
    load_platform_settings,
    public_setting_definitions,
    save_platform_settings,
)

router = APIRouter()


@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("settings.view")),
):
    values = await load_platform_settings(db)
    updated_at = await db.scalar(select(func.max(AdminSetting.updated_at)))
    return {
        "settings": values,
        "groups": public_setting_definitions(),
        "updated_at": updated_at.isoformat() if updated_at else None,
    }


@router.patch("/settings")
async def update_settings(
    payload: AdminSettingsUpdate,
    request: Request,
    admin: User = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db),
):
    updates = payload.model_dump(exclude_unset=True)
    before = await load_platform_settings(db)
    changed = {
        key: value for key, value in updates.items() if before.get(key) != value
    }

    if changed:
        await record_admin_action(
            db,
            admin,
            action="settings.update",
            target_type="settings",
            summary="Platform settings updated: " + ", ".join(sorted(changed)),
            details={
                "changes": {
                    key: {"from": before.get(key), "to": value}
                    for key, value in changed.items()
                }
            },
        )
        values = await save_platform_settings(db, changed, updated_by=admin.id)
        request.app.state.platform_settings = values
    else:
        values = before

    return {"settings": values}


@router.get("/activity")
async def activity_feed(
    action: str = "",
    admin_id: int | None = None,
    target_type: str = "",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("activity.view")),
):
    from app.models.admin_activity_log import AdminActivityLog
    from app.routers.admin.common import paginated, paging
    from app.services.admin_service import serialize_activity_log

    filters = []
    if action:
        filters.append(AdminActivityLog.action == action)
    if admin_id:
        filters.append(AdminActivityLog.admin_id == admin_id)
    if target_type:
        filters.append(AdminActivityLog.target_type == target_type)

    page_size, offset = paging(page, page_size)
    total = int(
        await db.scalar(
            select(func.count(AdminActivityLog.id)).where(*filters)
        )
        or 0
    )
    logs = (
        await db.execute(
            select(AdminActivityLog)
            .where(*filters)
            .order_by(AdminActivityLog.created_at.desc(), AdminActivityLog.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()
    return paginated([serialize_activity_log(log) for log in logs], total, page, page_size)
