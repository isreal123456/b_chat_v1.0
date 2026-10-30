"""Create in-app notifications according to each recipient's preferences."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user_preferences import UserPreferences
from app.websocket.notification import manager as notification_manager


_PREFERENCE_BY_TYPE = {
    "tick": "ticks",
    "comment": "comments",
    "friend_request": "follows",
    "friend_accepted": "follows",
    "follow": "follows",
    "message": "messages",
    "repost": "ticks",
    "collaboration_request": "follows",
    "collaboration_accepted": "follows",
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

    # Flush so the row gets an id and timestamp, then deliver best-effort over
    # the recipient's notification socket before the caller commits.
    await db.flush()
    await notification_manager.send_to_user(
        recipient_id,
        {
            "id": notification.id,
            "recipient_id": notification.recipient_id,
            "sender_id": notification.sender_id,
            "type": notification.type,
            "message": notification.message,
            "post_id": notification.post_id,
            "is_read": notification.is_read,
            "created_at": (
                notification.created_at.isoformat() if notification.created_at else None
            ),
        },
    )
    return notification
