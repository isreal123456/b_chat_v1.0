"""Shared admin serializers, audit logging, and irreversible account deletion."""

import json
from datetime import datetime

from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_activity_log import AdminActivityLog
from app.models.block import Block
from app.models.collaboration_request import CollaborationRequest
from app.models.comment import Comment
from app.models.conversation import Conversation
from app.models.conversation_member import ConversationMember
from app.models.creator_affinity import CreatorAffinity
from app.models.follow import Follow
from app.models.friend_request import Friend, FriendRequest
from app.models.message import Message
from app.models.notification import Notification
from app.models.post import Post
from app.models.post_image import PostImage
from app.models.post_impression import PostImpression
from app.models.post_video import PostVideo
from app.models.profile_image import ProfileImage
from app.models.project import Project
from app.models.project_image import ProjectImage
from app.models.report import Report
from app.models.save import Save
from app.models.search_history import SearchHistory
from app.models.share import Share
from app.models.tick import Tick
from app.models.user import User
from app.models.user_interaction import UserInteraction
from app.models.user_interest import UserInterest
from app.models.user_preferences import UserPreferences
from app.services.user_service import parse_skills


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


async def record_admin_action(
    db: AsyncSession,
    admin: User | None,
    *,
    action: str,
    target_type: str = "",
    target_id: int | None = None,
    summary: str = "",
    details: dict | None = None,
) -> AdminActivityLog:
    log = AdminActivityLog(
        admin_id=admin.id if admin else None,
        admin_email=admin.email if admin else "system",
        admin_username=admin.username if admin else "system",
        admin_role=admin.role if admin else "system",
        action=action,
        target_type=target_type,
        target_id=target_id,
        summary=summary[:255],
        details=json.dumps(details or {}, default=str, separators=(",", ":")),
    )
    db.add(log)
    return log


def serialize_activity_log(log: AdminActivityLog) -> dict:
    try:
        details = json.loads(log.details or "{}")
    except (TypeError, ValueError):
        details = {}
    return {
        "id": log.id,
        "admin": {
            "id": log.admin_id,
            "username": log.admin_username or "system",
            "email": log.admin_email or "system",
            "role": log.admin_role or "system",
        },
        "action": log.action,
        "target_type": log.target_type or "",
        "target_id": log.target_id,
        "summary": log.summary or "",
        "details": details,
        "created_at": iso(log.created_at),
    }


def serialize_admin_user(user: User, stats: dict | None = None) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.display_name or user.username,
        "avatar_url": f"/users/{user.id}/avatar",
        "bio": user.bio or "",
        "headline": user.headline or "",
        "category": user.category or "",
        "skills": parse_skills(user.skills),
        "location": user.location or "",
        "github_url": user.github_url or "",
        "portfolio_url": user.portfolio_url or "",
        "linkedin_url": user.linkedin_url or "",
        "available_for_work": bool(user.available_for_work),
        "email_verified": bool(user.email_verified),
        "onboarded": bool(user.onboarded),
        "role": user.role or "user",
        "account_status": user.account_status or "active",
        "suspended_at": iso(user.suspended_at),
        "suspension_reason": user.suspension_reason or "",
        "last_active_at": iso(user.last_active_at),
        "created_at": iso(user.created_at),
        **(stats or {}),
    }


def serialize_admin_post(
    post: Post,
    author: User | None,
    *,
    tick_count: int = 0,
    comment_count: int = 0,
    share_count: int = 0,
    report_count: int = 0,
) -> dict:
    return {
        "id": post.id,
        "content": post.content,
        "author": _author(author),
        "project_id": post.project_id,
        "created_at": iso(post.created_at),
        "moderation_status": post.moderation_status or "published",
        "removed_at": iso(post.removed_at),
        "removal_reason": post.removal_reason or "",
        "tick_count": int(tick_count or 0),
        "comment_count": int(comment_count or 0),
        "share_count": int(share_count or 0),
        "report_count": int(report_count or 0),
    }


def serialize_admin_comment(
    comment: Comment,
    author: User | None,
    *,
    report_count: int = 0,
) -> dict:
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "content": comment.content,
        "author": _author(author),
        "created_at": iso(comment.created_at),
        "moderation_status": comment.moderation_status or "published",
        "removed_at": iso(comment.removed_at),
        "removal_reason": comment.removal_reason or "",
        "report_count": int(report_count or 0),
    }


def serialize_admin_project(
    project: Project,
    owner: User | None,
    *,
    collaborator_count: int = 0,
    pending_collaboration_count: int = 0,
    post_count: int = 0,
    report_count: int = 0,
) -> dict:
    return {
        "id": project.id,
        "title": project.title,
        "tagline": project.tagline or "",
        "description": project.description or "",
        "category": project.category or "",
        "tech_stack": _parse_json_list(project.tech_stack),
        "repo_url": project.repo_url or "",
        "live_url": project.live_url or "",
        "status": project.status,
        "looking_for_collaborators": bool(project.looking_for_collaborators),
        "cover_url": f"/projects/{project.id}/cover",
        "owner": _author(owner),
        "created_at": iso(project.created_at),
        "updated_at": iso(project.updated_at),
        "moderation_status": project.moderation_status or "published",
        "featured": bool(project.featured),
        "featured_at": iso(project.featured_at),
        "removed_at": iso(project.removed_at),
        "removal_reason": project.removal_reason or "",
        "collaborator_count": int(collaborator_count or 0),
        "pending_collaboration_count": int(pending_collaboration_count or 0),
        "post_count": int(post_count or 0),
        "report_count": int(report_count or 0),
    }


def _author(user: User | None) -> dict | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "name": user.display_name or user.username,
        "avatar_url": f"/users/{user.id}/avatar",
        "category": user.category or "",
        "headline": user.headline or "",
    }


def _parse_json_list(raw: str | None) -> list[str]:
    try:
        value = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


async def serialize_reports(db: AsyncSession, reports: list[Report]) -> list[dict]:
    if not reports:
        return []

    reporter_ids = {report.reporter_id for report in reports if report.reporter_id}
    post_ids = {report.target_id for report in reports if report.target_type == "post"}
    comment_ids = {report.target_id for report in reports if report.target_type == "comment"}
    project_ids = {report.target_id for report in reports if report.target_type == "project"}
    user_ids = {report.target_id for report in reports if report.target_type == "user"}

    people: dict[int, User] = {}
    if reporter_ids:
        rows = await db.execute(select(User).where(User.id.in_(reporter_ids)))
        people.update({user.id: user for user in rows.scalars().all()})

    posts: dict[int, Post] = {}
    if post_ids:
        rows = await db.execute(select(Post).where(Post.id.in_(post_ids)))
        posts.update({post.id: post for post in rows.scalars().all()})
    comments: dict[int, Comment] = {}
    if comment_ids:
        rows = await db.execute(select(Comment).where(Comment.id.in_(comment_ids)))
        comments.update({comment.id: comment for comment in rows.scalars().all()})
    projects: dict[int, Project] = {}
    if project_ids:
        rows = await db.execute(select(Project).where(Project.id.in_(project_ids)))
        projects.update({project.id: project for project in rows.scalars().all()})
    users: dict[int, User] = {}
    if user_ids:
        rows = await db.execute(select(User).where(User.id.in_(user_ids)))
        users.update({user.id: user for user in rows.scalars().all()})

    author_ids = set()
    for post in posts.values():
        author_ids.add(post.user_id)
    for comment in comments.values():
        author_ids.add(comment.user_id)
    for project in projects.values():
        author_ids.add(project.owner_id)
    for user in users.values():
        author_ids.add(user.id)
    missing = author_ids - set(people)
    if missing:
        rows = await db.execute(select(User).where(User.id.in_(missing)))
        people.update({user.id: user for user in rows.scalars().all()})

    items = []
    for report in reports:
        reporter = people.get(report.reporter_id)
        target = _report_target(report, posts, comments, projects, users, people)
        items.append(
            {
                "id": report.id,
                "status": report.status,
                "reason": report.reason,
                "details": report.details or "",
                "content_snapshot": report.content_snapshot or "",
                "reporter": _author(reporter),
                "target_type": report.target_type,
                "target_id": report.target_id,
                "target": target,
                "reviewed_by": _author(people.get(report.reviewed_by)),
                "reviewed_at": iso(report.reviewed_at),
                "resolution_note": report.resolution_note or "",
                "resolution_action": report.resolution_action or "none",
                "created_at": iso(report.created_at),
            }
        )
    return items


def _report_target(
    report: Report,
    posts: dict[int, Post],
    comments: dict[int, Comment],
    projects: dict[int, Project],
    users: dict[int, User],
    people: dict[int, User],
) -> dict:
    if report.target_type == "post":
        post = posts.get(report.target_id)
        author = people.get(post.user_id) if post else None
        return {
            "available": post is not None,
            "kind": "post",
            "content": post.content if post else report.content_snapshot,
            "status": (post.moderation_status or "published") if post else "deleted",
            "author": _author(author),
            "url": f"/posts/{report.target_id}" if post else None,
        }
    if report.target_type == "comment":
        comment = comments.get(report.target_id)
        author = people.get(comment.user_id) if comment else None
        return {
            "available": comment is not None,
            "kind": "comment",
            "content": comment.content if comment else report.content_snapshot,
            "status": (comment.moderation_status or "published") if comment else "deleted",
            "post_id": comment.post_id if comment else None,
            "author": _author(author),
            "url": f"/posts/{comment.post_id}" if comment else None,
        }
    if report.target_type == "project":
        project = projects.get(report.target_id)
        author = people.get(project.owner_id) if project else None
        return {
            "available": project is not None,
            "kind": "project",
            "title": project.title if project else report.content_snapshot,
            "content": project.tagline if project else report.content_snapshot,
            "status": (project.moderation_status or "published") if project else "deleted",
            "author": _author(author),
            "url": f"/projects/{report.target_id}" if project else None,
        }
    user = users.get(report.target_id)
    return {
        "available": user is not None,
        "kind": "user",
        "title": (user.display_name or user.username) if user else report.content_snapshot,
        "content": (user.headline or user.bio or "") if user else report.content_snapshot,
        "status": (user.account_status or "active") if user else "deleted",
        "author": _author(user),
        "url": f"/profile/{user.username}" if user else None,
    }


async def delete_user_account(db: AsyncSession, user: User) -> None:
    """Remove every row belonging to a member, including content and signals."""

    user_id = user.id
    post_ids = list(
        (await db.execute(select(Post.id).where(Post.user_id == user_id))).scalars().all()
    )
    project_ids = list(
        (await db.execute(select(Project.id).where(Project.owner_id == user_id))).scalars().all()
    )

    await db.execute(
        delete(Notification).where(
            or_(
                Notification.recipient_id == user_id,
                Notification.sender_id == user_id,
                Notification.post_id.in_(post_ids) if post_ids else False,
            )
        )
    )
    await db.execute(
        delete(Message).where(
            or_(Message.sender_id == user_id, Message.receiver_id == user_id)
        )
    )
    await db.execute(
        delete(Comment).where(
            or_(Comment.user_id == user_id, Comment.post_id.in_(post_ids) if post_ids else False)
        )
    )
    await db.execute(delete(Tick).where(or_(Tick.user_id == user_id, Tick.post_id.in_(post_ids) if post_ids else False)))
    await db.execute(delete(Share).where(or_(Share.user_id == user_id, Share.post_id.in_(post_ids) if post_ids else False)))
    await db.execute(delete(Save).where(or_(Save.user_id == user_id, Save.post_id.in_(post_ids) if post_ids else False)))
    await db.execute(
        delete(PostImpression).where(
            or_(
                PostImpression.user_id == user_id,
                PostImpression.post_id.in_(post_ids) if post_ids else False,
            )
        )
    )
    await db.execute(
        delete(UserInteraction).where(
            or_(
                UserInteraction.user_id == user_id,
                UserInteraction.post_id.in_(post_ids) if post_ids else False,
            )
        )
    )
    if post_ids:
        await db.execute(delete(PostImage).where(PostImage.post_id.in_(post_ids)))
        await db.execute(delete(PostVideo).where(PostVideo.post_id.in_(post_ids)))
    await db.execute(delete(Post).where(Post.user_id == user_id))

    if project_ids:
        await db.execute(delete(ProjectImage).where(ProjectImage.project_id.in_(project_ids)))
        await db.execute(
            update(Post).where(Post.project_id.in_(project_ids)).values(project_id=None)
        )
        await db.execute(
            delete(CollaborationRequest).where(
                CollaborationRequest.project_id.in_(project_ids)
            )
        )
    await db.execute(
        delete(CollaborationRequest).where(CollaborationRequest.requester_id == user_id)
    )
    await db.execute(delete(Project).where(Project.owner_id == user_id))

    await db.execute(
        delete(Follow).where(
            or_(Follow.follower_id == user_id, Follow.following_id == user_id)
        )
    )
    await db.execute(
        delete(FriendRequest).where(
            or_(
                FriendRequest.sender_id == user_id,
                FriendRequest.receiver_id == user_id,
            )
        )
    )
    await db.execute(
        delete(Friend).where(or_(Friend.user_id == user_id, Friend.friend_id == user_id))
    )
    await db.execute(
        delete(Block).where(
            or_(Block.blocker_id == user_id, Block.blocked_id == user_id)
        )
    )
    await db.execute(
        delete(ConversationMember).where(ConversationMember.user_id == user_id)
    )
    await db.execute(delete(Conversation).where(~Conversation.id.in_(select(ConversationMember.conversation_id))))
    await db.execute(delete(UserPreferences).where(UserPreferences.user_id == user_id))
    await db.execute(delete(UserInterest).where(UserInterest.user_id == user_id))
    await db.execute(delete(SearchHistory).where(SearchHistory.user_id == user_id))
    await db.execute(
        delete(CreatorAffinity).where(
            or_(
                CreatorAffinity.user_id == user_id,
                CreatorAffinity.creator_id == user_id,
            )
        )
    )
    await db.execute(delete(ProfileImage).where(ProfileImage.user_id == user_id))

    await db.execute(
        update(Report).where(Report.reporter_id == user_id).values(reporter_id=None)
    )
    await db.execute(
        update(Report).where(Report.reviewed_by == user_id).values(reviewed_by=None)
    )
    await db.execute(
        update(Report).where(Report.target_author_id == user_id).values(target_author_id=None)
    )
    await db.execute(
        update(AdminActivityLog).where(AdminActivityLog.admin_id == user_id).values(admin_id=None)
    )

    await db.delete(user)
