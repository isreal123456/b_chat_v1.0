"""Create in-app notifications according to each recipient's preferences."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user_preferences import UserPreferences


_PREFERENCE_BY_TYPE = {
    "like": "likes",
    "comment": "comments",
    "friend_request": "follows",
    "friend_accepted": "follows",
    "message": "messages",
}


async def create_notification(
    db: AsyncSession,
    *,
    recipient_id: int,
    sender_id: int,
    kind: str,
    message: str,
    post_id: int | None = None,
) -> Notification | None:
    if recipient_id == sender_id:
        return None
    preference = await db.get(UserPreferences, recipient_id)
    preference_key = _PREFERENCE_BY_TYPE.get(kind)
    if preference_key and preference is not None and not getattr(preference, preference_key):
        return None
    notification = Notification(
        recipient_id=recipient_id,
        sender_id=sender_id,
        type=kind,
        message=message,
        post_id=post_id,
    )
    db.add(notification)
    return notification
