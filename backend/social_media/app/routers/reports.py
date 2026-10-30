"""Member-facing content reports."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.comment import Comment
from app.models.post import Post
from app.models.project import Project
from app.models.report import Report
from app.models.user import User
from app.schemas.admin import ReportCreate
from app.services.admin_notifications import notify_admins
from app.services.admin_service import serialize_reports
from app.services.moderation_service import remove_content
from app.services.platform_settings import get_platform_setting

router = APIRouter(prefix="/reports", tags=["reports"])

OPEN_STATUSES = ("pending", "under_review")


async def _resolve_target(
    db: AsyncSession, payload: ReportCreate, reporter: User
) -> tuple[User | None, int | None, str]:
    if payload.target_type == "user":
        target = await db.get(User, payload.target_id)
        if target is None or target.account_status != "active":
            raise HTTPException(status_code=404, detail="That member is no longer available")
        if target.id == reporter.id:
            raise HTTPException(status_code=400, detail="You cannot report yourself")
        return target, target.id, f"{target.display_name or target.username} (@{target.username})"

    if payload.target_type == "post":
        target = await db.get(Post, payload.target_id)
        if target is None or (target.moderation_status or "published") != "published":
            raise HTTPException(status_code=404, detail="That post is no longer available")
        author = await db.get(User, target.user_id)
        if author is not None and author.id == reporter.id:
            raise HTTPException(status_code=400, detail="You cannot report your own post")
        return author, target.user_id, target.content[:5000]

    if payload.target_type == "comment":
        target = await db.get(Comment, payload.target_id)
        if target is None or (target.moderation_status or "published") != "published":
            raise HTTPException(status_code=404, detail="That comment is no longer available")
        author = await db.get(User, target.user_id)
        if author is not None and author.id == reporter.id:
            raise HTTPException(status_code=400, detail="You cannot report your own comment")
        return author, target.user_id, target.content[:500]

    if payload.target_type == "project":
        target = await db.get(Project, payload.target_id)
        if target is None or (target.moderation_status or "published") != "published":
            raise HTTPException(status_code=404, detail="That project is no longer available")
        owner = await db.get(User, target.owner_id)
        if owner is not None and owner.id == reporter.id:
            raise HTTPException(status_code=400, detail="You cannot report your own project")
        return owner, target.owner_id, f"{target.title}: {target.tagline}"[:500]

    raise HTTPException(status_code=400, detail="Unsupported report target")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await get_platform_setting(db, "reports_enabled"):
        raise HTTPException(status_code=403, detail="Reporting is temporarily disabled")

    target_author, target_author_id, snapshot = await _resolve_target(
        db, payload, current_user
    )

    existing = await db.scalar(
        select(Report.id).where(
            Report.reporter_id == current_user.id,
            Report.target_type == payload.target_type,
            Report.target_id == payload.target_id,
            Report.status.in_(OPEN_STATUSES),
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have an open report for this content",
        )

    report = Report(
        reporter_id=current_user.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        target_author_id=target_author_id,
        reason=payload.reason,
        details=payload.details,
        content_snapshot=snapshot,
        status="pending",
    )
    db.add(report)
    await db.flush()

    if await get_platform_setting(db, "notify_admins_on_report"):
        await notify_admins(
            db,
            sender_id=current_user.id,
            kind="report",
            message=(
                f"{current_user.display_name or current_user.username} reported "
                f"a {payload.target_type} for {payload.reason.replace('_', ' ')}"
            ),
            exclude_id=current_user.id,
        )

    threshold = int(await get_platform_setting(db, "auto_hide_report_threshold") or 0)
    if threshold > 0 and payload.target_type in {"post", "comment", "project"}:
        open_count = await db.scalar(
            select(func.count(Report.id)).where(
                Report.target_type == payload.target_type,
                Report.target_id == payload.target_id,
                Report.status.in_(OPEN_STATUSES),
            )
        )
        if int(open_count or 0) >= threshold:
            await remove_content(
                db,
                target_type=payload.target_type,
                target_id=payload.target_id,
                reason=f"Automatically hidden after {open_count} open reports",
                admin=None,
                action="content.auto_hide",
                allow_system=True,
            )

    await db.commit()
    await db.refresh(report)
    return (await serialize_reports(db, [report]))[0]
