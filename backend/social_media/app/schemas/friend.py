from pydantic import BaseModel


class FriendRequestCreate(BaseModel):
    recipient_id: int


class FriendRequestRead(FriendRequestCreate):
    id: int
    status: str
