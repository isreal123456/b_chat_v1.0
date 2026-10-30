"""Moderation state changes shared by admin routes and automatic safeguards."""

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.post import Post
from app.models.project import Project
from app.models.user import User
from app.services.admin_service import record_admin_action

_TARGETS = {
    "post": Post,
    "comment": Comment,
    "project": Project,
}


async def load_target(db: AsyncSession, target_type: str, target_id: int):
    model = _TARGETS.get(target_type)
    if model is None:
        raise HTTPException(status_code=400, detail="Unsupported content type")
    target = await db.get(model, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Content not found")
    return target


def target_author_id(target) -> int | None:
    if isinstance(target, Post):
        return target.user_id
    if isinstance(target, Comment):
        return target.user_id
    if isinstance(target, Project):
        return target.owner_id
    return None


def target_label(target) -> str:
    if isinstance(target, Post):
        return f"Post #{target.id}"
    if isinstance(target, Comment):
        return f"Comment #{target.id}"
    if isinstance(target, Project):
        return f"Project “{target.title}”"
    return "Content"


async def remove_content(
    db: AsyncSession,
    *,
    target_type: str,
    target_id: int,
    reason: str,
    admin: User | None,
    action: str = "content.remove",
    allow_system: bool = False,
) -> object:
    target = await load_target(db, target_type, target_id)
    if (target.moderation_status or "published") == "removed":
        if allow_system:
            return target
        raise HTTPException(status_code=409, detail="This content is already removed")

    target.moderation_status = "removed"
    target.removed_by = admin.id if admin else None
    target.removed_at = datetime.utcnow()
    target.removal_reason = reason.strip()[:500]

    await record_admin_action(
        db,
        admin,
        action=action,
        target_type=target_type,
        target_id=target.id,
        summary=f"{target_label(target)} removed",
        details={
            "reason": reason.strip(),
            "author_id": target_author_id(target),
            "system": admin is None,
        },
    )
    return target


async def restore_content(
    db: AsyncSession,
    *,
    target_type: str,
    target_id: int,
    admin: User,
) -> object:
    target = await load_target(db, target_type, target_id)
    if (target.moderation_status or "published") == "published":
        raise HTTPException(status_code=409, detail="This content is already published")

    previous_reason = target.removal_reason or ""
    target.moderation_status = "published"
    target.removed_by = None
    target.removed_at = None
    target.removal_reason = ""

    await record_admin_action(
        db,
        admin,
        action="content.restore",
        target_type=target_type,
        target_id=target.id,
        summary=f"{target_label(target)} restored",
        details={"previous_reason": previous_reason, "author_id": target_author_id(target)},
    )
    return target
