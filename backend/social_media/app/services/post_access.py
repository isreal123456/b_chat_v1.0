from fastapi import HTTPException
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.friend_request import FriendRequest
from app.models.post import Post
from app.models.user import User
from app.models.user_preferences import UserPreferences


async def get_visible_post(post_id: int, current_user: User, db: AsyncSession) -> Post:
    post = await db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id == current_user.id:
        return post

    preferences = await db.get(UserPreferences, post.user_id)
    if preferences is None or not preferences.private_account:
        return post

    friendship = await db.execute(select(FriendRequest.id).where(
        FriendRequest.status == "accepted",
        or_(
            and_(FriendRequest.sender_id == post.user_id, FriendRequest.receiver_id == current_user.id),
            and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == post.user_id),
        ),
    ))
    if friendship.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post
