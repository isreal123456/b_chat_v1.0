from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class PostRead(PostCreate):
    id: int
    author_id: int
