from pydantic import BaseModel


class BlockRead(BaseModel):
    blocker_id: int
    blocked_id: int
