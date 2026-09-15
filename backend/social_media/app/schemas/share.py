from pydantic import BaseModel


class ShareRead(BaseModel):
    post_id: int
    user_id: int
