from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.websocket("/ws/chat/{conversation_id}")
async def chat_socket(websocket: WebSocket, conversation_id: int) -> None:
    await websocket.accept()
    await websocket.send_json({"conversation_id": conversation_id, "status": "connected"})
