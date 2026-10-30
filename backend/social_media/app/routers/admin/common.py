"""Shared helpers for administrative endpoints."""

from datetime import date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

RANGE_CHOICES = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
}


def paging(page: int, page_size: int) -> tuple[int, int]:
    page = max(1, int(page or 1))
    page_size = min(100, max(1, int(page_size or 20)))
    return page_size, (page - 1) * page_size


def paginated(items: list, total: int, page: int, page_size: int) -> dict:
    pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": items,
        "total": int(total or 0),
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


def range_days(value: str | None) -> int:
    return RANGE_CHOICES.get((value or "30d").lower(), 30)


def range_start(days: int) -> datetime:
    today = date.today()
    return datetime.combine(today - timedelta(days=days - 1), datetime.min.time())


def day_key(value) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)[:10]


def day_buckets(days: int) -> list[str]:
    today = date.today()
    return [(today - timedelta(days=offset)).isoformat() for offset in range(days - 1, -1, -1)]


async def counts_for(
    db: AsyncSession,
    model,
    key_column,
    ids: list[int] | set[int],
    *filters,
) -> dict[int, int]:
    if not ids:
        return {}
    stmt: Select = (
        select(key_column, func.count())
        .where(key_column.in_(list(ids)), *filters)
        .group_by(key_column)
    )
    rows = await db.execute(stmt)
    return {int(key): int(count) for key, count in rows.all()}


def ensure_can_manage_user(actor: User, target: User) -> None:
    """Prevent privilege escalation through user-management endpoints."""

    if actor.id == target.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot perform this action on your own account",
        )

    if target.role == "super_admin" and actor.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only a Super Admin can manage another Super Admin",
        )

    if target.role in {"admin", "moderator"} and actor.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only a Super Admin can manage administrator accounts",
        )
