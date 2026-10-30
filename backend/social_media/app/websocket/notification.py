from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        self.active_connections: dict[int, set[WebSocket]] = {}

    async def connect(
        self,
        user_id: int,
        websocket: WebSocket,
    ):
        await websocket.accept()

        self.active_connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket | None = None):
        sockets = self.active_connections.get(user_id)
        if sockets is None:
            return
        if websocket is None:
            self.active_connections.pop(user_id, None)
            return
        sockets.discard(websocket)
        if not sockets:
            self.active_connections.pop(user_id, None)

    async def send_to_user(
        self,
        user_id: int,
        message: dict,
    ):
        for websocket in list(self.active_connections.get(user_id, ())):
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(user_id, websocket)


manager = ConnectionManager()