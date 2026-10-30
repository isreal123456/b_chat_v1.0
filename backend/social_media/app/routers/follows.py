"""One-way follow graph, independent of accepted friend connections."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.follow import Follow
from app.models.user import User
from app.services.feed_cache import invalidate_feed_cache
from app.services.follow_service import get_follow_counts, get_followed_ids
from app.services.notification_service import create_notification
from app.services.user_service import serialize_public_user

router = APIRouter(prefix="/users", tags=["follows"])


async def _get_user(db: AsyncSession, user_id: int) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/follow")
async def follow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    target = await _get_user(db, user_id)

    existing = await db.scalar(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    if existing is None:
        db.add(Follow(follower_id=current_user.id, following_id=user_id))
        await create_notification(
            db,
            recipient_id=user_id,
            sender_id=current_user.id,
            kind="follow",
            message=f"{current_user.display_name or current_user.username} started following you",
        )
        try:
            await db.commit()
            await invalidate_feed_cache(current_user.id)
        except IntegrityError:
            await db.rollback()

    follower_count, _ = await get_follow_counts(db, target.id)
    return {"following": True, "follower_count": follower_count}


@router.delete("/{user_id}/follow")
async def unfollow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_user(db, user_id)

    existing = await db.scalar(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    if existing is not None:
        await db.delete(existing)
        await db.commit()
        await invalidate_feed_cache(current_user.id)

    follower_count, _ = await get_follow_counts(db, target.id)
    return {"following": False, "follower_count": follower_count}


async def _list_follow_users(
    db: AsyncSession,
    viewer_id: int,
    owner_id: int,
    *,
    followers: bool,
    limit: int,
    offset: int,
):
    if followers:
        join_condition = Follow.follower_id == User.id
        filter_condition = Follow.following_id == owner_id
    else:
        join_condition = Follow.following_id == User.id
        filter_condition = Follow.follower_id == owner_id

    result = await db.execute(
        select(User)
        .join(Follow, join_condition)
        .where(filter_condition)
        .order_by(Follow.created_at.desc(), Follow.id.desc())
        .limit(limit)
        .offset(offset)
    )
    users = result.scalars().all()
    followed = await get_followed_ids(db, viewer_id, [user.id for user in users])
    return [
        {**serialize_public_user(user), "is_following": user.id in followed}
        for user in users
    ]


@router.get("/{username}/followers")
async def list_followers(
    username: str,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    owner = await db.scalar(select(User).where(User.username == username))
    if owner is None:
        raise HTTPException(status_code=404, detail="User not found")
    return await _list_follow_users(
        db, current_user.id, owner.id, followers=True, limit=limit, offset=offset
    )


@router.get("/{username}/following")
async def list_following(
    username: str,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    owner = await db.scalar(select(User).where(User.username == username))
    if owner is None:
        raise HTTPException(status_code=404, detail="User not found")
    return await _list_follow_users(
        db, current_user.id, owner.id, followers=False, limit=limit, offset=offset
    )
