from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationRead
from app.websocket.notification import manager


router = APIRouter(prefix="/notifications", tags=["notifications"])
websocket_router = APIRouter(prefix="/ws", tags=["websocket"])


@router.get("", response_model=list[NotificationRead])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@websocket_router.websocket("/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    token = websocket.query_params.get("token")
    current_user = await authenticate_websocket_user(token, db)
    if current_user is None or current_user.id != user_id:
        await websocket.close(code=1008, reason="Invalid or missing token")
        return

    await manager.connect(
        current_user.id,
        websocket,
    )

    try:

        while True:

            await websocket.receive_json()

    except WebSocketDisconnect:
        manager.disconnect(current_user.id)


async def authenticate_websocket_user(
    token: str | None,
    db: AsyncSession,
) -> User | None:
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except JWTError:
        return None

    subject = payload.get("sub")
    if not subject:
        return None

    result = await db.execute(select(User).where(User.email == subject))
    return result.scalar_one_or_none()