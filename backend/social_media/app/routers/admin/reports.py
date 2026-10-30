"""Report queue and moderation decision endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.admin import require_permission
from app.models.comment import Comment
from app.models.post import Post
from app.models.project import Project
from app.models.report import Report
from app.models.user import User
from app.routers.admin.common import (
    ensure_can_manage_user,
    paginated,
    paging,
)
from app.schemas.admin import ReportUpdate
from app.services.admin_service import (
    record_admin_action,
    serialize_admin_user,
    serialize_reports,
)
from app.services.moderation_service import remove_content, restore_content
from app.services.notification_service import create_notification

router = APIRouter()

STATUS_ORDER = case(
    (Report.status == "pending", 0),
    (Report.status == "under_review", 1),
    else_=2,
)


@router.get("/reports")
async def list_reports(
    status: str = Query(default=""),
    target_type: str = Query(default=""),
    reason: str = Query(default=""),
    q: str = Query(default="", max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("reports.view")),
):
    filters = []
    if status in {"pending", "under_review", "resolved", "dismissed"}:
        filters.append(Report.status == status)
    if target_type in {"user", "post", "comment", "project"}:
        filters.append(Report.target_type == target_type)
    if reason:
        filters.append(Report.reason == reason)
    query = q.strip()
    if query:
        pattern = f"%{query}%"
        matching_users = select(User.id).where(
            or_(User.username.ilike(pattern), User.display_name.ilike(pattern))
        )
        filters.append(
            or_(
                Report.details.ilike(pattern),
                Report.content_snapshot.ilike(pattern),
                Report.target_author_id.in_(matching_users),
                Report.reporter_id.in_(matching_users),
            )
        )

    counts_rows = await db.execute(select(Report.status, func.count()).group_by(Report.status))
    counts = {"pending": 0, "under_review": 0, "resolved": 0, "dismissed": 0}
    for key, count in counts_rows.all():
        if key in counts:
            counts[key] = int(count)

    page_size, offset = paging(page, page_size)
    total = int(await db.scalar(select(func.count(Report.id)).where(*filters)) or 0)
    reports = (
        await db.execute(
            select(Report)
            .where(*filters)
            .order_by(STATUS_ORDER, Report.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()
    payload = paginated(await serialize_reports(db, list(reports)), total, page, page_size)
    payload["counts"] = counts
    payload["open"] = counts["pending"] + counts["under_review"]
    return payload


@router.get("/reports/{report_id}")
async def report_detail(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("reports.view")),
):
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    item = (await serialize_reports(db, [report]))[0]
    history = (
        await db.execute(
            select(Report)
            .where(
                Report.target_type == report.target_type,
                Report.target_id == report.target_id,
                Report.id != report.id,
            )
            .order_by(Report.created_at.desc())
            .limit(10)
        )
    ).scalars().all()
    author = (
        await db.get(User, report.target_author_id)
        if report.target_author_id is not None
        else None
    )
    return {
        **item,
        "target_author_account": serialize_admin_user(author) if author else None,
        "history": await serialize_reports(db, list(history)),
    }


@router.patch("/reports/{report_id}")
async def update_report(
    report_id: int,
    payload: ReportUpdate,
    admin: User = Depends(require_permission("reports.manage")),
    db: AsyncSession = Depends(get_db),
):
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status in {"resolved", "dismissed"}:
        raise HTTPException(status_code=409, detail="This report is already closed")

    if payload.status in {"resolved", "dismissed"} and len(payload.resolution_note) < 3:
        raise HTTPException(
            status_code=400,
            detail="Add a short resolution note before closing this report",
        )

    action_taken = payload.resolution_action
    target_author = None
    if report.target_author_id is not None:
        target_author = await db.get(User, report.target_author_id)

    if action_taken in {"content_removed", "content_restored"}:
        if report.target_type not in {"post", "comment", "project"}:
            raise HTTPException(
                status_code=400,
                detail="This report does not reference removable content",
            )

    if action_taken == "content_removed":
        target = await _load_content(db, report.target_type, report.target_id)
        if target is not None and (target.moderation_status or "published") != "removed":
            await remove_content(
                db,
                target_type=report.target_type,
                target_id=report.target_id,
                reason=payload.resolution_note or f"Resolved report #{report.id}",
                admin=admin,
            )
    elif action_taken == "content_restored":
        target = await _load_content(db, report.target_type, report.target_id)
        if target is not None and (target.moderation_status or "published") == "removed":
            await restore_content(
                db,
                target_type=report.target_type,
                target_id=report.target_id,
                admin=admin,
            )
    elif action_taken == "user_suspended":
        if target_author is None:
            raise HTTPException(
                status_code=400,
                detail="The reported account is no longer available",
            )
        ensure_can_manage_user(admin, target_author)
        if target_author.account_status != "suspended":
            target_author.account_status = "suspended"
            target_author.suspended_at = datetime.utcnow()
            target_author.suspension_reason = (
                payload.resolution_note or f"Resolved report #{report.id}"
            )[:255]
            await record_admin_action(
                db,
                admin,
                action="user.suspend",
                target_type="user",
                target_id=target_author.id,
                summary=f"@{target_author.username} suspended via report #{report.id}",
                details={
                    "reason": target_author.suspension_reason,
                    "report_id": report.id,
                },
            )

    report.status = payload.status
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.utcnow()
    report.resolution_note = payload.resolution_note
    report.resolution_action = action_taken

    closing = payload.status in {"resolved", "dismissed"}
    await record_admin_action(
        db,
        admin,
        action="report.dismiss" if payload.status == "dismissed" else (
            "report.resolve" if closing else "report.review"
        ),
        target_type="report",
        target_id=report.id,
        summary=(
            f"Report #{report.id} {payload.status.replace('_', ' ')}"
            f" ({report.target_type} #{report.target_id})"
        ),
        details={
            "note": payload.resolution_note,
            "action": action_taken,
            "target_type": report.target_type,
            "target_id": report.target_id,
            "reason": report.reason,
        },
    )

    if closing and report.reporter_id is not None:
        await create_notification(
            db,
            recipient_id=report.reporter_id,
            sender_id=admin.id,
            kind="report_update",
            message=(
                f"Your report was {payload.status}. "
                + (payload.resolution_note or "Thanks for helping keep TickMe safe.")
            )[:500],
        )

    await db.commit()
    await db.refresh(report)
    return (await serialize_reports(db, [report]))[0]


async def _load_content(db: AsyncSession, target_type: str, target_id: int):
    model = {"post": Post, "comment": Comment, "project": Project}.get(target_type)
    if model is None:
        return None
    return await db.get(model, target_id)
