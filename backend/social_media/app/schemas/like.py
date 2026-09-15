from pydantic import BaseModel


class LikeRead(BaseModel):
    post_id: int
    user_id: int
