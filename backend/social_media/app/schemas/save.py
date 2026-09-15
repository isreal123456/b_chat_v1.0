from pydantic import BaseModel


class SaveRead(BaseModel):
    post_id: int
    user_id: int
