from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.message_crypto import decrypt_message, encrypt_message
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.message import Message
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

    async def send_message(self, receiver_id: int, message: dict):
        websocket = self.active_connections.get(receiver_id)

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
    if current_user is None:
        await websocket.close(code=1008, reason="Invalid or missing token")
        return

    await manager.connect(current_user.id, websocket)

    try:
        while True:
            data = await websocket.receive_json()

            receiver_id = data.get("receiver_id")
            content = data.get("content")
            if not isinstance(receiver_id, int) or not isinstance(content, str) or not content.strip():
                await websocket.send_json({"error": "receiver_id and non-empty content are required"})
                continue

            message = Message(
                sender_id=current_user.id,
                receiver_id=receiver_id,
                content=encrypt_message(content),
                is_read=False,
            )

            db.add(message)
            await db.commit()
            await db.refresh(message)

            
            await manager.send_message(
                receiver_id,
                {
                    "id": message.id,
                    "sender_id": message.sender_id,
                    "receiver_id": message.receiver_id,
                    "content": decrypt_message(message.content),
                        "created_at": message.created_at.isoformat(),
                }
            )


            

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



@router.get("/{user_id}/history", status_code=200)
async def get_message_history(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message).where(
            (Message.sender_id == current_user.id) & (Message.receiver_id == user_id) |
            (Message.sender_id == user_id) & (Message.receiver_id == current_user.id)
        ).order_by(Message.created_at)
    )
    messages = result.scalars().all()

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


