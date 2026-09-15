from pydantic import BaseModel


class ConversationCreate(BaseModel):
    member_ids: list[int]


class ConversationRead(BaseModel):
    id: int
