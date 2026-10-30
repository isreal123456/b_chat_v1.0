"""Follow graph helpers."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow import Follow


async def get_follow_counts(db: AsyncSession, user_id: int) -> tuple[int, int]:
    followers = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
    )
    following = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
    )
    return int(followers or 0), int(following or 0)


async def is_following(db: AsyncSession, follower_id: int, following_id: int) -> bool:
    if follower_id == following_id:
        return False
    result = await db.scalar(
        select(Follow.id).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        )
    )
    return result is not None


async def get_followed_ids(
    db: AsyncSession,
    follower_id: int,
    candidate_ids: list[int],
) -> set[int]:
    if not candidate_ids:
        return set()
    result = await db.scalars(
        select(Follow.following_id).where(
            Follow.follower_id == follower_id,
            Follow.following_id.in_(candidate_ids),
        )
    )
    return set(result.all())
