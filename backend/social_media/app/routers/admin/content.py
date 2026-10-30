"""Content moderation endpoints for posts and comments."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.admin import require_permission
from app.models.comment import Comment
from app.models.post import Post
from app.models.report import Report
from app.models.share import Share
from app.models.tick import Tick
from app.models.user import User
from app.routers.admin.common import counts_for, paginated, paging
from app.schemas.admin import ModerationReasonRequest
from app.services.admin_service import (
    serialize_admin_comment,
    serialize_admin_post,
    serialize_reports,
)
from app.services.moderation_service import remove_content, restore_content

router = APIRouter()

OPEN_REPORT_STATUSES = ("pending", "under_review")


def _post_report_exists():
    return (
        select(Report.id)
        .where(
            Report.target_type == "post",
            Report.target_id == Post.id,
            Report.status.in_(OPEN_REPORT_STATUSES),
        )
        .exists()
    )


def _comment_report_exists():
    return (
        select(Report.id)
        .where(
            Report.target_type == "comment",
            Report.target_id == Comment.id,
            Report.status.in_(OPEN_REPORT_STATUSES),
        )
        .exists()
    )


async def _authors(db: AsyncSession, ids: set[int]) -> dict[int, User]:
    if not ids:
        return {}
    rows = await db.execute(select(User).where(User.id.in_(ids)))
    return {user.id: user for user in rows.scalars().all()}


async def _post_items(db: AsyncSession, posts: list[Post]) -> list[dict]:
    ids = [post.id for post in posts]
    ticks = await counts_for(db, Tick, Tick.post_id, ids)
    comments = await counts_for(db, Comment, Comment.post_id, ids)
    shares = await counts_for(db, Share, Share.post_id, ids)
    reports = await counts_for(db, Report, Report.target_id, ids, Report.target_type == "post")
    authors = await _authors(db, {post.user_id for post in posts})
    return [
        serialize_admin_post(
            post,
            authors.get(post.user_id),
            tick_count=ticks.get(post.id, 0),
            comment_count=comments.get(post.id, 0),
            share_count=shares.get(post.id, 0),
            report_count=reports.get(post.id, 0),
        )
        for post in posts
    ]


async def _comment_items(db: AsyncSession, comments: list[Comment]) -> list[dict]:
    ids = [comment.id for comment in comments]
    reports = await counts_for(
        db, Report, Report.target_id, ids, Report.target_type == "comment"
    )
    authors = await _authors(db, {comment.user_id for comment in comments})
    return [
        serialize_admin_comment(
            comment,
            authors.get(comment.user_id),
            report_count=reports.get(comment.id, 0),
        )
        for comment in comments
    ]


@router.get("/posts")
async def list_posts(
    q: str = Query(default="", max_length=200),
    status: str = Query(default=""),
    author_id: int | None = Query(default=None),
    reported: bool = Query(default=False),
    sort: str = Query(default="newest"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("content.view")),
):
    filters = []
    query = q.strip()
    if query:
        filters.append(Post.content.ilike(f"%{query}%"))
    if status in {"published", "removed"}:
        filters.append(Post.moderation_status == status)
    if author_id:
        filters.append(Post.user_id == author_id)
    if reported:
        filters.append(_post_report_exists())

    page_size, offset = paging(page, page_size)
    total = int(await db.scalar(select(func.count(Post.id)).where(*filters)) or 0)
    order = Post.created_at.asc() if sort == "oldest" else Post.created_at.desc()
    posts = (
        await db.execute(
            select(Post).where(*filters).order_by(order, Post.id.desc()).offset(offset).limit(page_size)
        )
    ).scalars().all()
    return paginated(await _post_items(db, list(posts)), total, page, page_size)


@router.get("/posts/{post_id}")
async def post_detail(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("content.view")),
):
    post = await db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    items = await _post_items(db, [post])
    comments = (
        await db.execute(
            select(Comment)
            .where(Comment.post_id == post.id)
            .order_by(Comment.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    reports = (
        await db.execute(
            select(Report)
            .where(Report.target_type == "post", Report.target_id == post.id)
            .order_by(Report.created_at.desc())
        )
    ).scalars().all()

    return {
        **items[0],
        "comments": await _comment_items(db, list(comments)),
        "reports": await serialize_reports(db, list(reports)),
    }


@router.post("/posts/{post_id}/remove")
async def remove_post(
    post_id: int,
    payload: ModerationReasonRequest,
    admin: User = Depends(require_permission("content.moderate")),
    db: AsyncSession = Depends(get_db),
):
    target = await remove_content(
        db,
        target_type="post",
        target_id=post_id,
        reason=payload.reason,
        admin=admin,
    )
    await db.commit()
    author = await db.get(User, target.user_id)
    return serialize_admin_post(target, author)


@router.post("/posts/{post_id}/restore")
async def restore_post(
    post_id: int,
    admin: User = Depends(require_permission("content.moderate")),
    db: AsyncSession = Depends(get_db),
):
    target = await restore_content(
        db, target_type="post", target_id=post_id, admin=admin
    )
    await db.commit()
    author = await db.get(User, target.user_id)
    return serialize_admin_post(target, author)


@router.get("/comments")
async def list_comments(
    q: str = Query(default="", max_length=200),
    status: str = Query(default=""),
    post_id: int | None = Query(default=None),
    author_id: int | None = Query(default=None),
    reported: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("content.view")),
):
    filters = []
    query = q.strip()
    if query:
        filters.append(Comment.content.ilike(f"%{query}%"))
    if status in {"published", "removed"}:
        filters.append(Comment.moderation_status == status)
    if post_id:
        filters.append(Comment.post_id == post_id)
    if author_id:
        filters.append(Comment.user_id == author_id)
    if reported:
        filters.append(_comment_report_exists())

    page_size, offset = paging(page, page_size)
    total = int(await db.scalar(select(func.count(Comment.id)).where(*filters)) or 0)
    comments = (
        await db.execute(
            select(Comment)
            .where(*filters)
            .order_by(Comment.created_at.desc(), Comment.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()
    return paginated(await _comment_items(db, list(comments)), total, page, page_size)


@router.post("/comments/{comment_id}/remove")
async def remove_comment(
    comment_id: int,
    payload: ModerationReasonRequest,
    admin: User = Depends(require_permission("content.moderate")),
    db: AsyncSession = Depends(get_db),
):
    target = await remove_content(
        db,
        target_type="comment",
        target_id=comment_id,
        reason=payload.reason,
        admin=admin,
    )
    await db.commit()
    return (await _comment_items(db, [target]))[0]


@router.post("/comments/{comment_id}/restore")
async def restore_comment(
    comment_id: int,
    admin: User = Depends(require_permission("content.moderate")),
    db: AsyncSession = Depends(get_db),
):
    target = await restore_content(
        db, target_type="comment", target_id=comment_id, admin=admin
    )
    await db.commit()
    return (await _comment_items(db, [target]))[0]
