"""Ticks router — TickMe's unique engagement system.

Endpoints
---------
POST   /ticks/{post_id}          Tick a post (idempotent 201/400)
DELETE /ticks/{post_id}          Untick a post
GET    /ticks/{post_id}/count    Return tick count for a post
GET    /ticks/{post_id}/who      Return users who ticked a post
GET    /ticks/my-ticks           Return post IDs the current user ticked
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.tick import Tick
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.schemas.tick import TickCountRead, TickRead, TickedPostsRead
from app.services.feed_cache import invalidate_feed_cache
from app.services.notification_service import create_notification
from app.services.post_access import get_visible_post

router = APIRouter(prefix="/ticks", tags=["ticks"])


@router.post(
    "/{post_id}",
    response_model=TickRead,
    status_code=status.HTTP_201_CREATED,
    summary="Tick a post",
)
async def tick_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tick a post. Duplicate requests are rejected by the unique constraint."""
    post = await get_visible_post(post_id, current_user, db)
    author_preferences = await db.get(UserPreferences, post.user_id)
    if author_preferences is not None and not author_preferences.allow_ticks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user is not accepting ticks on their posts",
        )

    # Guard — prevent duplicate ticks before hitting the DB constraint
    existing = await db.execute(
        select(Tick).where(
            and_(Tick.post_id == post_id, Tick.user_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already ticked this post",
        )

    tick = Tick(post_id=post_id, user_id=current_user.id)
    db.add(tick)

    # Notify the post author (skipped if author == current user)
    await create_notification(
        db,
        recipient_id=post.user_id,
        sender_id=current_user.id,
        kind="tick",
        message=(
            f"{current_user.display_name or current_user.username} ticked your post"
        ),
        post_id=post.id,
    )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already ticked this post",
        )

    await db.refresh(tick)
    tick_count = await db.scalar(
        select(func.count(Tick.id)).where(Tick.post_id == post_id)
    )
    await invalidate_feed_cache(current_user.id)
    return {
        "id": tick.id,
        "post_id": tick.post_id,
        "user_id": tick.user_id,
        "tick_count": tick_count,
    }


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_200_OK,
    summary="Untick a post",
)
async def untick_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a Tick from a post."""
    await get_visible_post(post_id, current_user, db)

    result = await db.execute(
        select(Tick).where(
            and_(Tick.post_id == post_id, Tick.user_id == current_user.id)
        )
    )
    tick = result.scalar_one_or_none()

    if not tick:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have not ticked this post",
        )

    await db.delete(tick)
    await db.commit()
    await invalidate_feed_cache(current_user.id)
    tick_count = await db.scalar(
        select(func.count(Tick.id)).where(Tick.post_id == post_id)
    )
    return {"message": "Post unticked successfully", "post_id": post_id, "tick_count": tick_count}


@router.get(
    "/my-ticks",
    response_model=TickedPostsRead,
    summary="List post IDs ticked by the current user",
)
async def get_my_ticks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tick).where(Tick.user_id == current_user.id)
    )
    ticks = result.scalars().all()
    return TickedPostsRead(
        user_id=current_user.id,
        ticked_posts=[t.post_id for t in ticks],
    )


@router.get(
    "/{post_id}/count",
    response_model=TickCountRead,
    summary="Get the tick count for a post",
)
async def get_tick_count(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_visible_post(post_id, current_user, db)
    result = await db.execute(
        select(func.count(Tick.id)).where(Tick.post_id == post_id)
    )
    tick_count = result.scalar_one()
    ticked = await db.scalar(
        select(Tick.id).where(
            Tick.post_id == post_id,
            Tick.user_id == current_user.id,
        )
    )
    return TickCountRead(post_id=post_id, tick_count=tick_count, ticked=ticked is not None)


@router.get(
    "/{post_id}/who",
    summary="Get users who ticked a post",
)
async def get_who_ticked(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_visible_post(post_id, current_user, db)
    result = await db.execute(
        select(User)
        .join(Tick, Tick.user_id == User.id)
        .where(Tick.post_id == post_id)
        .order_by(Tick.id.desc())
        .limit(50)
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "name": u.display_name or u.username,
            "avatar_url": f"/users/{u.id}/avatar",
        }
        for u in users
    ]
