"""In-app alerts addressed to the active administrative team."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import ADMIN_ROLES
from app.models.user import User
from app.services.notification_service import create_notification


async def notify_admins(
    db: AsyncSession,
    *,
    sender_id: int,
    kind: str,
    message: str,
    exclude_id: int | None = None,
) -> None:
    result = await db.execute(
        select(User.id).where(
            User.role.in_(tuple(ADMIN_ROLES)),
            User.account_status == "active",
        )
    )
    for (admin_id,) in result.all():
        if admin_id == exclude_id:
            continue
        await create_notification(
            db,
            recipient_id=admin_id,
            sender_id=sender_id,
            kind=kind,
            message=message,
        )
