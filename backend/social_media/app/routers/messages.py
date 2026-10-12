from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select

from app.core.config import settings
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.message import Message
from app.models.friend_request import FriendRequest
from app.services.notification_service import create_notification
from app.models.user import User


router = APIRouter(prefix="/messages", tags=["messages"])



class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_message(self, user_id: int, message: dict):
        websocket = self.active_connections.get(user_id)

        if websocket:
            await websocket.send_json(message)


manager = ConnectionManager()

@router.websocket("/ws/")
@router.websocket("/ws/{path_user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    path_user_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    token = websocket.query_params.get("token")
    current_user = await authenticate_websocket_user(token, db)
    if current_user is None or (
        path_user_id is not None and path_user_id != current_user.id
    ):
        await websocket.close(code=1008, reason="Invalid or missing token")
        return

    current_user_id = current_user.id
    await manager.connect(current_user_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()

            receiver_id = data.get("receiver_id")
            content = data.get("content")
            if (not isinstance(receiver_id, int) or isinstance(receiver_id, bool)
                    or not isinstance(content, str) or not content.strip() or len(content) > 5000):
                await websocket.send_json({"error": "Enter a receiver and a message of 1 to 5000 characters"})
                continue
            receiver = await db.get(User, receiver_id)
            if receiver is None:
                await websocket.send_json({"error": "Recipient not found"})
                continue
            if receiver_id != current_user_id:
                friendship = await db.execute(select(FriendRequest.id).where(
                    FriendRequest.status == "accepted",
                    or_(
                    (FriendRequest.sender_id == current_user_id) & (FriendRequest.receiver_id == receiver_id),
                    (FriendRequest.sender_id == receiver_id) & (FriendRequest.receiver_id == current_user_id),
                    ),
                ).limit(1))
                prior_message = await db.execute(select(Message.id).where(or_(
                    (Message.sender_id == current_user_id) & (Message.receiver_id == receiver_id),
                    (Message.sender_id == receiver_id) & (Message.receiver_id == current_user_id),
                )).limit(1))
                if friendship.scalar_one_or_none() is None and prior_message.scalar_one_or_none() is None:
                    await websocket.send_json({"error": "You can message friends or continue an existing conversation"})
                    continue

            message = Message(
                sender_id=current_user_id,
                receiver_id=receiver_id,
                content=content,
                is_read=False,
            )

            db.add(message)
            await create_notification(
                db, recipient_id=receiver_id, sender_id=current_user_id,
                kind="message", message=f"{current_user.display_name or current_user.username} sent you a message",
            )
            await db.commit()
            await db.refresh(message)

            
            payload = {
                "id": message.id,
                "sender_id": message.sender_id,
                "receiver_id": message.receiver_id,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            }
            await manager.send_message(receiver_id, payload)
            if receiver_id != current_user_id:
                await manager.send_message(current_user_id, payload)


            

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(current_user_id)


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



@router.get("/{user_id}/history", status_code=200)
async def get_message_history(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message).where(or_(
            (Message.sender_id == current_user.id) & (Message.receiver_id == user_id),
            (Message.sender_id == user_id) & (Message.receiver_id == current_user.id),
        )).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    changed = False
    for message in messages:
        if message.receiver_id == current_user.id and not message.is_read:
            message.is_read = True
            changed = True
    if changed:
        await db.commit()

    return [
        {
            "id": message.id,
            "sender_id": message.sender_id,
            "receiver_id": message.receiver_id,
            "content": message.content,
            "created_at": message.created_at.isoformat()
        }
        for message in messages
    ]


