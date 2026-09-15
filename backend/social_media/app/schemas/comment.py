from pydantic import BaseModel


class CommentCreate(BaseModel):
    content: str


class CommentRead(CommentCreate):
    id: int
    post_id: int
    author_id: int
    content: str
