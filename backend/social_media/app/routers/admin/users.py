"""User management endpoints for the admin console."""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.admin import get_current_admin, require_permission
from app.models.admin_activity_log import AdminActivityLog
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.post import Post
from app.models.project import Project
from app.models.report import Report
from app.models.share import Share
from app.models.tick import Tick
from app.models.user import User
from app.routers.admin.common import (
    counts_for,
    ensure_can_manage_user,
    paging,
)
from app.schemas.admin import (
    AdminRoleUpdate,
    AdminUserUpdate,
    DeleteUserRequest,
    SuspendUserRequest,
)
from app.services.admin_service import (
    delete_user_account,
    record_admin_action,
    serialize_activity_log,
    serialize_admin_post,
    serialize_admin_user,
    serialize_reports,
)

router = APIRouter()

ROLE_VALUES = {"user", "moderator", "admin", "super_admin"}
STATUS_VALUES = {"active", "suspended"}
SORT_VALUES = {
    "newest": User.created_at.desc(),
    "oldest": User.created_at.asc(),
    "username": User.username.asc(),
    "activity": User.last_active_at.desc(),
}
OPEN_REPORT_STATUSES = ("pending", "under_review")


def paged(items, total, page, page_size):
    return {
        "items": items,
        "total": int(total or 0),
        "page": page,
        "page_size": page_size,
        "pages": max(1, (int(total or 0) + page_size - 1) // page_size),
    }


async def _user_stats(db: AsyncSession, ids: list[int]) -> dict[int, dict]:
    if not ids:
        return {}
    posts = await counts_for(db, Post, Post.user_id, ids)
    comments = await counts_for(db, Comment, Comment.user_id, ids)
    followers = await counts_for(db, Follow, Follow.following_id, ids)
    following = await counts_for(db, Follow, Follow.follower_id, ids)
    projects = await counts_for(
        db, Project, Project.owner_id, ids, Project.moderation_status == "published"
    )
    open_reports = await counts_for(
        db, Report, Report.target_author_id, ids, Report.status.in_(OPEN_REPORT_STATUSES)
    )
    return {
        user_id: {
            "post_count": posts.get(user_id, 0),
            "comment_count": comments.get(user_id, 0),
            "follower_count": followers.get(user_id, 0),
            "following_count": following.get(user_id, 0),
            "project_count": projects.get(user_id, 0),
            "open_report_count": open_reports.get(user_id, 0),
        }
        for user_id in ids
    }


@router.get("/users")
async def list_users(
    q: str = Query(default="", max_length=100),
    role: str = Query(default=""),
    status: str = Query(default=""),
    category: str = Query(default=""),
    sort: str = Query(default="newest"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("users.view")),
):
    filters = []
    query = q.strip()
    if query:
        pattern = f"%{query}%"
        filters.append(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.display_name.ilike(pattern),
            )
        )
    if role:
        if role not in ROLE_VALUES:
            raise HTTPException(status_code=400, detail="Unknown role filter")
        filters.append(User.role == role)
    if status:
        if status not in STATUS_VALUES:
            raise HTTPException(status_code=400, detail="Unknown status filter")
        filters.append(User.account_status == status)
    if category in {"developer", "designer"}:
        filters.append(User.category == category)
    elif category == "other":
        filters.append(User.category.not_in(("developer", "designer")))

    order = SORT_VALUES.get(sort, SORT_VALUES["newest"])
    page_size, offset = paging(page, page_size)
    total = int(
        await db.scalar(select(func.count(User.id)).where(*filters)) or 0
    )
    users = (
        await db.execute(
            select(User).where(*filters).order_by(order, User.id.desc()).offset(offset).limit(page_size)
        )
    ).scalars().all()
    stats = await _user_stats(db, [user.id for user in users])
    items = [serialize_admin_user(user, stats.get(user.id)) for user in users]
    return paged(items, total, page, page_size)


@router.get("/admins")
async def list_admins(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("settings.view")),
):
    users = (
        await db.execute(
            select(User)
            .where(User.role.in_(("super_admin", "admin", "moderator")))
            .order_by(User.role.desc(), User.username.asc())
        )
    ).scalars().all()
    return {"items": [serialize_admin_user(user) for user in users]}


@router.get("/users/{user_id}")
async def user_detail(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("users.view")),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Member not found")

    stats = (await _user_stats(db, [user.id])).get(user.id, {})
    ticks_received = int(
        await db.scalar(
            select(func.count(Tick.id))
            .join(Post, Post.id == Tick.post_id)
            .where(Post.user_id == user.id)
        )
        or 0
    )
    stats["ticks_received"] = ticks_received

    recent_posts = (
        await db.execute(
            select(Post).where(Post.user_id == user.id).order_by(Post.created_at.desc()).limit(6)
        )
    ).scalars().all()
    post_ids = [post.id for post in recent_posts]
    post_ticks = await counts_for(db, Tick, Tick.post_id, post_ids)
    post_comments = await counts_for(db, Comment, Comment.post_id, post_ids)
    post_shares = await counts_for(db, Share, Share.post_id, post_ids)

    reports = (
        await db.execute(
            select(Report)
            .where(
                or_(
                    Report.target_author_id == user.id,
                    (Report.target_type == "user") & (Report.target_id == user.id),
                )
            )
            .order_by(Report.created_at.desc())
            .limit(8)
        )
    ).scalars().all()

    activity = (
        await db.execute(
            select(AdminActivityLog)
            .where(
                AdminActivityLog.target_type == "user",
                AdminActivityLog.target_id == user.id,
            )
            .order_by(AdminActivityLog.created_at.desc())
            .limit(8)
        )
    ).scalars().all()

    return {
        **serialize_admin_user(user, stats),
        "recent_posts": [
            serialize_admin_post(
                post,
                user,
                tick_count=post_ticks.get(post.id, 0),
                comment_count=post_comments.get(post.id, 0),
                share_count=post_shares.get(post.id, 0),
            )
            for post in recent_posts
        ],
        "reports": await serialize_reports(db, list(reports)),
        "activity": [serialize_activity_log(log) for log in activity],
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    admin: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Member not found")
    ensure_can_manage_user(admin, user)

    changes = payload.model_dump(exclude_unset=True)
    if "username" in changes and changes["username"] != user.username:
        taken = await db.scalar(
            select(User.id).where(User.username == changes["username"], User.id != user.id)
        )
        if taken is not None:
            raise HTTPException(status_code=409, detail="That username is already in use")
    if "email" in changes and changes["email"] != user.email:
        taken = await db.scalar(
            select(User.id).where(User.email == changes["email"], User.id != user.id)
        )
        if taken is not None:
            raise HTTPException(status_code=409, detail="That email is already in use")

    allowed = {
        "username",
        "email",
        "name",
        "bio",
        "headline",
        "category",
        "skills",
        "github_url",
        "portfolio_url",
        "linkedin_url",
        "location",
        "available_for_work",
        "email_verified",
    }
    previous = {}
    for field, value in changes.items():
        if field not in allowed:
            continue
        attribute = "display_name" if field == "name" else field
        if field == "skills":
            value = json.dumps(value or [], ensure_ascii=False)
        if getattr(user, attribute) != value:
            previous[field] = getattr(user, attribute)
            setattr(user, attribute, value)

    if not previous:
        return serialize_admin_user(user)

    await record_admin_action(
        db,
        admin,
        action="user.update",
        target_type="user",
        target_id=user.id,
        summary=f"Profile for @{user.username} updated by an administrator",
        details={"fields": sorted(previous.keys()), "before": previous},
    )
    await db.commit()
    await db.refresh(user)
    stats = (await _user_stats(db, [user.id])).get(user.id, {})
    return serialize_admin_user(user, stats)


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    payload: SuspendUserRequest,
    admin: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Member not found")
    ensure_can_manage_user(admin, user)
    if user.account_status == "suspended":
        raise HTTPException(status_code=409, detail="This account is already suspended")

    user.account_status = "suspended"
    user.suspended_at = datetime.utcnow()
    user.suspension_reason = payload.reason
    await record_admin_action(
        db,
        admin,
        action="user.suspend",
        target_type="user",
        target_id=user.id,
        summary=f"@{user.username} suspended",
        details={"reason": payload.reason, "role": user.role},
    )
    await db.commit()
    await db.refresh(user)
    stats = (await _user_stats(db, [user.id])).get(user.id, {})
    return serialize_admin_user(user, stats)


@router.post("/users/{user_id}/restore")
async def restore_user(
    user_id: int,
    admin: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Member not found")
    ensure_can_manage_user(admin, user)
    if user.account_status == "active":
        raise HTTPException(status_code=409, detail="This account is already active")

    previous_reason = user.suspension_reason
    user.account_status = "active"
    user.suspended_at = None
    user.suspension_reason = ""
    await record_admin_action(
        db,
        admin,
        action="user.restore",
        target_type="user",
        target_id=user.id,
        summary=f"@{user.username} restored",
        details={"previous_reason": previous_reason},
    )
    await db.commit()
    await db.refresh(user)
    stats = (await _user_stats(db, [user.id])).get(user.id, {})
    return serialize_admin_user(user, stats)


@router.patch("/users/{user_id}/role")
async def change_role(
    user_id: int,
    payload: AdminRoleUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.core.permissions import has_permission

    if not has_permission(admin.role, "admins.manage"):
        raise HTTPException(status_code=403, detail="Only a Super Admin can change roles")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Member not found")
    ensure_can_manage_user(admin, user)

    if payload.role == user.role:
        return serialize_admin_user(user)

    if user.role == "super_admin" and payload.role != "super_admin":
        remaining = int(
            await db.scalar(
                select(func.count(User.id)).where(
                    User.role == "super_admin", User.id != user.id
                )
            )
            or 0
        )
        if remaining == 0:
            raise HTTPException(
                status_code=400, detail="At least one Super Admin must remain"
            )

    previous_role = user.role
    user.role = payload.role
    await record_admin_action(
        db,
        admin,
        action="role.change",
        target_type="user",
        target_id=user.id,
        summary=f"@{user.username}: {previous_role} → {payload.role}",
        details={"previous_role": previous_role, "new_role": payload.role},
    )
    await db.commit()
    await db.refresh(user)
    return serialize_admin_user(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    payload: DeleteUserRequest,
    admin: User = Depends(require_permission("users.delete")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Member not found")
    ensure_can_manage_user(admin, user)

    if payload.confirm.strip().lower() != user.username.lower():
        raise HTTPException(
            status_code=400,
            detail="Type the member's username exactly to confirm deletion",
        )

    if user.role == "super_admin":
        remaining = int(
            await db.scalar(
                select(func.count(User.id)).where(
                    User.role == "super_admin", User.id != user.id
                )
            )
            or 0
        )
        if remaining == 0:
            raise HTTPException(
                status_code=400, detail="At least one Super Admin must remain"
            )

    snapshot = {
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "category": user.category,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "reason": payload.reason,
    }
    await record_admin_action(
        db,
        admin,
        action="user.delete",
        target_type="user",
        target_id=user.id,
        summary=f"@{user.username} permanently deleted",
        details=snapshot,
    )
    await delete_user_account(db, user)
    await db.commit()
    return {"message": f"@{snapshot['username']} was permanently deleted"}
