from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.post import Post
from app.models.share import Share
from app.models.user import User
from app.services.feed_cache import invalidate_feed_cache
from app.services.notification_service import create_notification
from app.services.post_access import get_visible_post

router = APIRouter(prefix="/shares", tags=["shares"])


async def _share_count(db: AsyncSession, post_id: int) -> int:
    return int(
        await db.scalar(select(func.count(Share.id)).where(Share.post_id == post_id)) or 0
    )


@router.post("/{post_id}", status_code=status.HTTP_201_CREATED)
async def repost(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await get_visible_post(post_id, current_user, db)

    existing = await db.scalar(
        select(Share.id).where(Share.post_id == post_id, Share.user_id == current_user.id)
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="You already reposted this post")

    db.add(Share(post_id=post_id, user_id=current_user.id))
    await create_notification(
        db,
        recipient_id=post.user_id,
        sender_id=current_user.id,
        kind="repost",
        message=f"{current_user.display_name or current_user.username} reposted your update",
        post_id=post.id,
    )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="You already reposted this post")

    await invalidate_feed_cache(current_user.id)
    return {
        "post_id": post_id,
        "shared": True,
        "share_count": await _share_count(db, post_id),
    }


@router.delete("/{post_id}")
async def unrepost(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    share = await db.scalar(
        select(Share).where(Share.post_id == post_id, Share.user_id == current_user.id)
    )
    if share is None:
        raise HTTPException(status_code=404, detail="You have not reposted this post")

    await db.delete(share)
    await db.commit()
    await invalidate_feed_cache(current_user.id)
    return {
        "post_id": post_id,
        "shared": False,
        "share_count": await _share_count(db, post_id),
    }
