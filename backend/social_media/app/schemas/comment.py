from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    post_id: int
    content: str = Field(min_length=1, max_length=500)


class CommentResponse(CommentCreate):
    id: int
    user_id: int
    author: str

    model_config = {"from_attributes": True}
