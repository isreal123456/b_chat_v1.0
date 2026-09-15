from pydantic import BaseModel


class PostCreate(BaseModel):

    content: str



class PostRead(PostCreate):
    id: int
    author_id: int
