"""Dashboard overview aggregates computed directly from the database."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.admin import require_permission
from app.models.admin_activity_log import AdminActivityLog
from app.models.comment import Comment
from app.models.message import Message
from app.models.post import Post
from app.models.project import Project
from app.models.report import Report
from app.models.share import Share
from app.models.tick import Tick
from app.models.user import User
from app.routers.admin.common import day_buckets, day_key, range_days, range_start
from app.services.admin_service import (
    serialize_activity_log,
    serialize_admin_user,
    serialize_reports,
)

router = APIRouter()

PROTECTED_PERMISSION = "dashboard.view"


async def _scalar_count(db: AsyncSession, stmt) -> int:
    return int(await db.scalar(stmt) or 0)


def _activity_union(since: datetime):
    return union_all(
        select(Post.user_id.label("user_id"), Post.created_at.label("created_at")).where(
            Post.created_at >= since
        ),
        select(
            Comment.user_id.label("user_id"), Comment.created_at.label("created_at")
        ).where(Comment.created_at >= since),
        select(Tick.user_id.label("user_id"), Tick.created_at.label("created_at")).where(
            Tick.created_at >= since
        ),
        select(
            Share.user_id.label("user_id"), Share.created_at.label("created_at")
        ).where(Share.created_at >= since),
        select(
            Message.sender_id.label("user_id"), Message.created_at.label("created_at")
        ).where(Message.created_at >= since),
        select(
            User.id.label("user_id"), User.last_active_at.label("created_at")
        ).where(User.last_active_at.is_not(None), User.last_active_at >= since),
    ).subquery()


async def daily_counts(db: AsyncSession, model, date_column, since: datetime, *filters) -> dict[str, int]:
    rows = await db.execute(
        select(func.date(date_column), func.count())
        .where(date_column >= since, *filters)
        .group_by(func.date(date_column))
    )
    return {day_key(day): int(count) for day, count in rows.all()}


async def daily_active_users(db: AsyncSession, since: datetime) -> dict[str, int]:
    activity = _activity_union(since)
    rows = await db.execute(
        select(func.date(activity.c.created_at), func.count(func.distinct(activity.c.user_id)))
        .group_by(func.date(activity.c.created_at))
    )
    return {day_key(day): int(count) for day, count in rows.all()}


def filled_series(keys: list[str], values: dict[str, int]) -> list[int]:
    return [values.get(key, 0) for key in keys]


async def active_user_count(db: AsyncSession, since: datetime) -> int:
    activity = _activity_union(since)
    return int(
        await db.scalar(select(func.count(func.distinct(activity.c.user_id)))) or 0
    )


@router.get("/overview")
async def overview(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(PROTECTED_PERMISSION)),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    week_start = today_start - timedelta(days=6)
    month_start = today_start - timedelta(days=29)

    total_users = await _scalar_count(db, select(func.count(User.id)))
    active_accounts = await _scalar_count(
        db, select(func.count(User.id)).where(User.account_status == "active")
    )
    suspended_accounts = await _scalar_count(
        db, select(func.count(User.id)).where(User.account_status != "active")
    )
    developers = await _scalar_count(
        db,
        select(func.count(User.id)).where(
            User.category == "developer", User.account_status == "active"
        ),
    )
    designers = await _scalar_count(
        db,
        select(func.count(User.id)).where(
            User.category == "designer", User.account_status == "active"
        ),
    )

    total_posts = await _scalar_count(db, select(func.count(Post.id)))
    published_posts = await _scalar_count(
        db, select(func.count(Post.id)).where(Post.moderation_status == "published")
    )
    removed_posts = total_posts - published_posts
    total_comments = await _scalar_count(db, select(func.count(Comment.id)))
    published_comments = await _scalar_count(
        db,
        select(func.count(Comment.id)).where(Comment.moderation_status == "published"),
    )
    total_ticks = await _scalar_count(db, select(func.count(Tick.id)))
    total_projects = await _scalar_count(
        db, select(func.count(Project.id)).where(Project.moderation_status == "published")
    )
    featured_projects = await _scalar_count(
        db,
        select(func.count(Project.id)).where(
            Project.featured.is_(True), Project.moderation_status == "published"
        ),
    )

    pending_reports = await _scalar_count(
        db,
        select(func.count(Report.id)).where(Report.status.in_(("pending", "under_review"))),
    )
    new_reports_today = await _scalar_count(
        db, select(func.count(Report.id)).where(Report.created_at >= today_start)
    )

    new_users_today = await _scalar_count(
        db, select(func.count(User.id)).where(User.created_at >= today_start)
    )
    new_users_week = await _scalar_count(
        db, select(func.count(User.id)).where(User.created_at >= week_start)
    )
    new_posts_today = await _scalar_count(
        db, select(func.count(Post.id)).where(Post.created_at >= today_start)
    )

    dau_now = await active_user_count(db, today_start)
    mau_now = await active_user_count(db, month_start)

    recent_users = (
        await db.execute(select(User).order_by(User.created_at.desc()).limit(6))
    ).scalars().all()
    recent_report_rows = (
        await db.execute(select(Report).order_by(Report.created_at.desc()).limit(5))
    ).scalars().all()
    recent_logs = (
        await db.execute(
            select(AdminActivityLog).order_by(AdminActivityLog.created_at.desc()).limit(6)
        )
    ).scalars().all()

    return {
        "totals": {
            "users": total_users,
            "active_users": active_accounts,
            "suspended_users": suspended_accounts,
            "developers": developers,
            "designers": designers,
            "posts": total_posts,
            "published_posts": published_posts,
            "removed_posts": removed_posts,
            "comments": total_comments,
            "published_comments": published_comments,
            "ticks": total_ticks,
            "projects": total_projects,
            "featured_projects": featured_projects,
            "pending_reports": pending_reports,
            "new_reports_today": new_reports_today,
            "new_users_today": new_users_today,
            "new_users_week": new_users_week,
            "new_posts_today": new_posts_today,
            "dau": dau_now,
            "mau": mau_now,
        },
        "recent_users": [serialize_admin_user(user) for user in recent_users],
        "recent_reports": await serialize_reports(db, list(recent_report_rows)),
        "recent_activity": [serialize_activity_log(log) for log in recent_logs],
    }


@router.get("/overview/activity")
async def overview_activity(
    days: int = Query(default=30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(PROTECTED_PERMISSION)),
):
    since = range_start(days)
    keys = day_buckets(days)

    registrations = await daily_counts(db, User, User.created_at, since)
    posts = await daily_counts(db, Post, Post.created_at, since)
    comments = await daily_counts(db, Comment, Comment.created_at, since)
    ticks = await daily_counts(db, Tick, Tick.created_at, since)
    shares = await daily_counts(db, Share, Share.created_at, since)
    dau = await daily_active_users(db, since)

    total_before = await _scalar_count(
        db, select(func.count(User.id)).where(User.created_at < since)
    )
    cumulative: list[int] = []
    running = total_before
    for key in keys:
        running += registrations.get(key, 0)
        cumulative.append(running)

    return {
        "days": days,
        "labels": keys,
        "registrations": filled_series(keys, registrations),
        "posts": filled_series(keys, posts),
        "comments": filled_series(keys, comments),
        "ticks": filled_series(keys, ticks),
        "shares": filled_series(keys, shares),
        "dau": filled_series(keys, dau),
        "cumulative_users": cumulative,
    }
