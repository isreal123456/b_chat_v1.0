"""Platform analytics with real SQL aggregates and no synthetic numbers."""

import json
from collections import Counter
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.admin import require_permission
from app.models.collaboration_request import CollaborationRequest
from app.models.comment import Comment
from app.models.post import Post
from app.models.project import Project
from app.models.share import Share
from app.models.tick import Tick
from app.models.user import User
from app.routers.admin.common import counts_for, day_buckets, range_days, range_start
from app.routers.admin.overview import (
    active_user_count,
    daily_active_users,
    daily_counts,
    filled_series,
)
from app.services.admin_service import _author, serialize_admin_project

router = APIRouter()


def _parse_list(raw: str | None) -> list[str]:
    try:
        value = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _technology_ranking(users: list[User], projects: list[Project]) -> list[dict]:
    counter: Counter[str] = Counter()
    labels: dict[str, str] = {}
    for user in users:
        for skill in _parse_list(user.skills):
            key = skill.lower()
            labels.setdefault(key, skill)
            counter[key] += 1
    for project in projects:
        for technology in _parse_list(project.tech_stack):
            key = technology.lower()
            labels.setdefault(key, technology)
            counter[key] += 1
    return [
        {"name": labels[key], "count": count}
        for key, count in counter.most_common(12)
    ]


@router.get("/analytics")
async def analytics(
    range: str = Query(default="30d"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("analytics.view")),
):
    days = range_days(range)
    since = range_start(days)
    keys = day_buckets(days)
    today_start = datetime.combine(date.today(), datetime.min.time())
    week_start = today_start - timedelta(days=6)
    month_start = today_start - timedelta(days=29)

    new_users = int(
        await db.scalar(select(func.count(User.id)).where(User.created_at >= since)) or 0
    )
    new_posts = int(
        await db.scalar(select(func.count(Post.id)).where(Post.created_at >= since)) or 0
    )
    new_ticks = int(
        await db.scalar(select(func.count(Tick.id)).where(Tick.created_at >= since)) or 0
    )
    new_comments = int(
        await db.scalar(
            select(func.count(Comment.id)).where(Comment.created_at >= since)
        )
        or 0
    )
    new_shares = int(
        await db.scalar(select(func.count(Share.id)).where(Share.created_at >= since)) or 0
    )
    new_projects = int(
        await db.scalar(
            select(func.count(Project.id)).where(
                Project.created_at >= since, Project.moderation_status == "published"
            )
        )
        or 0
    )
    active_in_range = await active_user_count(db, since)

    category_rows = await db.execute(
        select(User.category, func.count(User.id))
        .where(User.account_status == "active")
        .group_by(User.category)
    )
    category_counts = {key or "other": int(count) for key, count in category_rows.all()}
    category_split = [
        {"key": "developer", "label": "Developers", "value": category_counts.get("developer", 0)},
        {"key": "designer", "label": "Designers", "value": category_counts.get("designer", 0)},
        {"key": "other", "label": "Other", "value": category_counts.get("other", 0)},
    ]

    active_users = (
        await db.execute(select(User).where(User.account_status == "active"))
    ).scalars().all()
    published_projects = (
        await db.execute(select(Project).where(Project.moderation_status == "published"))
    ).scalars().all()
    technologies = _technology_ranking(list(active_users), list(published_projects))

    activity_parts = [
        select(Post.user_id.label("user_id"), literal(1).label("weight")).where(
            Post.created_at >= since
        ),
        select(Comment.user_id.label("user_id"), literal(1).label("weight")).where(
            Comment.created_at >= since
        ),
        select(Tick.user_id.label("user_id"), literal(1).label("weight")).where(
            Tick.created_at >= since
        ),
        select(Share.user_id.label("user_id"), literal(1).label("weight")).where(
            Share.created_at >= since
        ),
    ]
    activity = union_all(*activity_parts).subquery()
    score = func.sum(activity.c.weight)
    top_rows = (
        await db.execute(
            select(activity.c.user_id, score.label("score"))
            .group_by(activity.c.user_id)
            .order_by(score.desc())
            .limit(8)
        )
    ).all()
    top_ids = [int(user_id) for user_id, _ in top_rows]
    scores = {int(user_id): int(total) for user_id, total in top_rows}
    top_people = {}
    if top_ids:
        rows = await db.execute(select(User).where(User.id.in_(top_ids)))
        top_people = {user.id: user for user in rows.scalars().all()}
    post_counts = await counts_for(
        db, Post, Post.user_id, top_ids, Post.created_at >= since
    )
    tick_counts = await counts_for(
        db, Tick, Tick.user_id, top_ids, Tick.created_at >= since
    )
    comment_counts = await counts_for(
        db, Comment, Comment.user_id, top_ids, Comment.created_at >= since
    )
    most_active_users = [
        {
            "user": _author(top_people.get(user_id)),
            "score": scores[user_id],
            "posts": post_counts.get(user_id, 0),
            "ticks": tick_counts.get(user_id, 0),
            "comments": comment_counts.get(user_id, 0),
        }
        for user_id in top_ids
        if top_people.get(user_id) is not None
    ]

    tick_totals = (
        select(Tick.post_id.label("post_id"), func.count().label("tick_count"))
        .where(Tick.created_at >= since)
        .group_by(Tick.post_id)
        .subquery()
    )
    top_post_rows = (
        await db.execute(
            select(Post, tick_totals.c.tick_count)
            .join(tick_totals, tick_totals.c.post_id == Post.id)
            .where(Post.moderation_status == "published")
            .order_by(tick_totals.c.tick_count.desc(), Post.created_at.desc())
            .limit(6)
        )
    ).all()
    top_author_ids = {post.user_id for post, _ in top_post_rows}
    top_authors = {}
    if top_author_ids:
        rows = await db.execute(select(User).where(User.id.in_(top_author_ids)))
        top_authors = {user.id: user for user in rows.scalars().all()}
    most_ticked_posts = [
        {
            "id": post.id,
            "content": post.content[:280],
            "author": _author(top_authors.get(post.user_id)),
            "tick_count": int(count),
            "comment_count": 0,
            "created_at": post.created_at.isoformat() if post.created_at else None,
        }
        for post, count in top_post_rows
    ]

    project_post_counts = (
        select(Post.project_id.label("project_id"), func.count().label("post_count"))
        .where(Post.project_id.is_not(None), Post.moderation_status == "published")
        .group_by(Post.project_id)
        .subquery()
    )
    collaborator_counts = (
        select(
            CollaborationRequest.project_id.label("project_id"),
            func.count().label("collaborator_count"),
        )
        .where(CollaborationRequest.status == "accepted")
        .group_by(CollaborationRequest.project_id)
        .subquery()
    )
    popularity = (
        func.coalesce(project_post_counts.c.post_count, 0)
        + func.coalesce(collaborator_counts.c.collaborator_count, 0) * 3
    )
    project_rows = (
        await db.execute(
            select(
                Project,
                func.coalesce(project_post_counts.c.post_count, 0),
                func.coalesce(collaborator_counts.c.collaborator_count, 0),
            )
            .outerjoin(
                project_post_counts, project_post_counts.c.project_id == Project.id
            )
            .outerjoin(
                collaborator_counts, collaborator_counts.c.project_id == Project.id
            )
            .where(Project.moderation_status == "published")
            .order_by(popularity.desc(), Project.created_at.desc())
            .limit(6)
        )
    ).all()
    owner_ids = {project.owner_id for project, _, _ in project_rows}
    owners = {}
    if owner_ids:
        rows = await db.execute(select(User).where(User.id.in_(owner_ids)))
        owners = {user.id: user for user in rows.scalars().all()}
    popular_projects = [
        serialize_admin_project(
            project,
            owners.get(project.owner_id),
            collaborator_count=int(collaborators),
            post_count=int(posts),
        )
        for project, posts, collaborators in project_rows
    ]

    registrations = await daily_counts(db, User, User.created_at, since)
    posts = await daily_counts(db, Post, Post.created_at, since)
    comments = await daily_counts(db, Comment, Comment.created_at, since)
    ticks = await daily_counts(db, Tick, Tick.created_at, since)
    shares = await daily_counts(db, Share, Share.created_at, since)
    dau = await daily_active_users(db, since)

    engagement_actions = new_ticks + new_comments + new_shares
    engagement_rate = round(engagement_actions / new_posts, 2) if new_posts else 0.0

    return {
        "range": range if range in {"7d", "30d", "90d", "365d"} else "30d",
        "days": days,
        "totals": {
            "new_users": new_users,
            "active_users": active_in_range,
            "posts": new_posts,
            "ticks": new_ticks,
            "comments": new_comments,
            "shares": new_shares,
            "projects": new_projects,
            "engagement_rate": engagement_rate,
            "avg_posts_per_active_user": round(new_posts / active_in_range, 2)
            if active_in_range
            else 0.0,
        },
        "interval_totals": {
            "daily": {
                "active_users": await active_user_count(db, today_start),
                "new_users": int(
                    await db.scalar(
                        select(func.count(User.id)).where(User.created_at >= today_start)
                    )
                    or 0
                ),
                "posts": int(
                    await db.scalar(
                        select(func.count(Post.id)).where(Post.created_at >= today_start)
                    )
                    or 0
                ),
            },
            "weekly": {
                "active_users": await active_user_count(db, week_start),
                "new_users": int(
                    await db.scalar(
                        select(func.count(User.id)).where(User.created_at >= week_start)
                    )
                    or 0
                ),
                "posts": int(
                    await db.scalar(
                        select(func.count(Post.id)).where(Post.created_at >= week_start)
                    )
                    or 0
                ),
            },
            "monthly": {
                "active_users": await active_user_count(db, month_start),
                "new_users": int(
                    await db.scalar(
                        select(func.count(User.id)).where(User.created_at >= month_start)
                    )
                    or 0
                ),
                "posts": int(
                    await db.scalar(
                        select(func.count(Post.id)).where(Post.created_at >= month_start)
                    )
                    or 0
                ),
            },
        },
        "category_split": category_split,
        "technologies": technologies,
        "most_active_users": most_active_users,
        "most_ticked_posts": most_ticked_posts,
        "popular_projects": popular_projects,
        "trends": {
            "labels": keys,
            "registrations": filled_series(keys, registrations),
            "posts": filled_series(keys, posts),
            "comments": filled_series(keys, comments),
            "ticks": filled_series(keys, ticks),
            "shares": filled_series(keys, shares),
            "dau": filled_series(keys, dau),
        },
    }
