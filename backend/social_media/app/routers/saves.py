from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.comment import Comment
from app.models.post import Post
from app.models.post_image import PostImage
from app.models.post_video import PostVideo
from app.models.project import Project
from app.models.save import Save
from app.models.share import Share
from app.models.tick import Tick
from app.models.user import User
from app.services.post_access import get_visible_post
from app.services.feed_cache import invalidate_feed_cache

router = APIRouter(prefix="/saves", tags=["saves"])


@router.post("/{post_id}", status_code=status.HTTP_201_CREATED)
async def save_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_visible_post(post_id, current_user, db)

    result = await db.execute(
        select(Save).where(
            Save.post_id == post_id,
            Save.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Post already saved")

    saved_post = Save(post_id=post_id, user_id=current_user.id)
    db.add(saved_post)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Post already saved")
    await db.refresh(saved_post)
    await invalidate_feed_cache(current_user.id)

    save_count = int(
        await db.scalar(select(func.count(Save.id)).where(Save.post_id == post_id)) or 0
    )
    return {
        "post_id": post_id,
        "saved": True,
        "save_count": save_count,
        "save_id": saved_post.id,
    }


@router.delete("/{post_id}", status_code=status.HTTP_200_OK)
async def unsave_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Save).where(
            Save.post_id == post_id,
            Save.user_id == current_user.id,
        )
    )
    saved_post = result.scalar_one_or_none()
    if saved_post is None:
        raise HTTPException(status_code=404, detail="Post is not saved")

    await db.delete(saved_post)
    await db.commit()
    await invalidate_feed_cache(current_user.id)

    save_count = int(
        await db.scalar(select(func.count(Save.id)).where(Save.post_id == post_id)) or 0
    )
    return {"post_id": post_id, "saved": False, "save_count": save_count}


@router.get("", status_code=status.HTTP_200_OK)
async def get_saved_posts(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    save_ids = list(
        (
            await db.scalars(
                select(Save.post_id)
                .where(Save.user_id == current_user.id)
                .order_by(Save.created_at.desc(), Save.id.desc())
            )
        ).all()
    )
    total = len(save_ids)
    page_ids = save_ids[offset : offset + limit]

    if not page_ids:
        return {"items": [], "total": total, "limit": limit, "offset": offset}

    rows = await db.execute(
        select(Post, User, Project)
        .join(User, User.id == Post.user_id)
        .outerjoin(Project, Project.id == Post.project_id)
        .where(Post.id.in_(page_ids))
    )
    by_id = {post.id: (post, creator, project) for post, creator, project in rows.all()}

    tick_counts = {
        post_id: int(count)
        for post_id, count in (
            await db.execute(select(Tick.post_id, func.count(Tick.id)).where(Tick.post_id.in_(page_ids)).group_by(Tick.post_id))
        ).all()
    }
    comment_counts = {
        post_id: int(count)
        for post_id, count in (
            await db.execute(select(Comment.post_id, func.count(Comment.id)).where(Comment.post_id.in_(page_ids)).group_by(Comment.post_id))
        ).all()
    }
    share_counts = {
        post_id: int(count)
        for post_id, count in (
            await db.execute(select(Share.post_id, func.count(Share.id)).where(Share.post_id.in_(page_ids)).group_by(Share.post_id))
        ).all()
    }
    save_counts = {
        post_id: int(count)
        for post_id, count in (
            await db.execute(select(Save.post_id, func.count(Save.id)).where(Save.post_id.in_(page_ids)).group_by(Save.post_id))
        ).all()
    }
    ticked_ids = set(
        (
            await db.scalars(
                select(Tick.post_id).where(
                    Tick.post_id.in_(page_ids), Tick.user_id == current_user.id
                )
            )
        ).all()
    )
    shared_ids = set(
        (
            await db.scalars(
                select(Share.post_id).where(
                    Share.post_id.in_(page_ids), Share.user_id == current_user.id
                )
            )
        ).all()
    )
    image_ids = set(
        (
            await db.scalars(
                select(PostImage.post_id).where(PostImage.post_id.in_(page_ids))
            )
        ).all()
    )
    video_ids = set(
        (
            await db.scalars(
                select(PostVideo.post_id).where(PostVideo.post_id.in_(page_ids))
            )
        ).all()
    )

    items = []
    for post_id in page_ids:
        found = by_id.get(post_id)
        if found is None:
            continue
        post, creator, project = found
        items.append(
            {
                "id": post.id,
                "feed_id": f"post-{post.id}",
                "user_id": post.user_id,
                "author": creator.display_name or creator.username,
                "username": creator.username,
                "content": post.content,
                "image": f"/posts/{post.id}/image" if post.id in image_ids else None,
                "video": f"/posts/{post.id}/video" if post.id in video_ids else None,
                "project": (
                    {
                        "id": project.id,
                        "title": project.title,
                        "category": project.category or "",
                        "status": project.status,
                        "cover_url": f"/projects/{project.id}/cover",
                    }
                    if project
                    else None
                ),
                "created_at": post.created_at,
                "reposted_by": None,
                "tick_count": tick_counts.get(post.id, 0),
                "ticked": post.id in ticked_ids,
                "comment_count": comment_counts.get(post.id, 0),
                "share_count": share_counts.get(post.id, 0),
                "save_count": save_counts.get(post.id, 0),
                "saved": True,
                "shared": post.id in shared_ids,
            }
        )

    return {"items": items, "total": total, "limit": limit, "offset": offset}
