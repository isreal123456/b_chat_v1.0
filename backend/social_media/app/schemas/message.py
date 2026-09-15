from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str


class MessageRead(MessageCreate):
    id: int
    conversation_id: int
    sender_id: int
