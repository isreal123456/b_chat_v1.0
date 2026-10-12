from fastapi import APIRouter
from app.models.like import Like
from app.database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException, status
from app.dependencies import get_current_user
from app.models.user import User
from sqlalchemy import and_, func, select
from app.services.post_access import get_visible_post
from app.services.notification_service import create_notification
from app.services.feed_cache import invalidate_feed_cache

router = APIRouter(prefix="/likes", tags=["likes"])

@router.post("/{post_id}", status_code=status.HTTP_201_CREATED)
async def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    post = await get_visible_post(post_id, current_user, db)

    # Check if the user has already liked the post
    result = await db.execute(
        select(Like).where(
            and_(Like.post_id == post_id, Like.user_id == current_user.id)
        )
    )
    existing_like = result.scalar_one_or_none()

    if existing_like:
        raise HTTPException(
            status_code=400,
            detail="You have already liked this post"
        )

    new_like = Like(post_id=post_id, user_id=current_user.id)
    db.add(new_like)
    await create_notification(
        db, recipient_id=post.user_id, sender_id=current_user.id,
        kind="like", message=f"{current_user.display_name or current_user.username} liked your post",
        post_id=post.id,
    )
    await db.commit()
    await db.refresh(new_like)
    await invalidate_feed_cache(current_user.id)

    return {"message": "Post liked successfully", "like_id": new_like.id}


@router.delete("/{post_id}", status_code=status.HTTP_200_OK)
async def unlike_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_visible_post(post_id, current_user, db)
    # Check if the user has liked the post
    result = await db.execute(
        select(Like).where(
            and_(Like.post_id == post_id, Like.user_id == current_user.id)
        )
    )
    existing_like = result.scalar_one_or_none()

    if not existing_like:
        raise HTTPException(
            status_code=404,
            detail="You have not liked this post"
        )

    await db.delete(existing_like)
    await db.commit()
    await invalidate_feed_cache(current_user.id)

    return {"message": "Post unliked successfully"}


@router.get("/{post_id}/count", status_code=status.HTTP_200_OK)
async def get_like_count(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_visible_post(post_id, current_user, db)
    result = await db.execute(
        select(func.count(Like.id)).where(Like.post_id == post_id)
    )
    like_count = result.scalar_one()

    return {"post_id": post_id, "like_count": like_count}


@router.get("/post_like", status_code=status.HTTP_200_OK)
async def get_posts_like(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Like).where(Like.user_id == current_user.id)
    )
    likes = result.scalars().all()

    return {"user_id": current_user.id, "liked_posts": [like.post_id for like in likes]}
