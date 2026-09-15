from pydantic import BaseModel

from app.schemas.post import PostRead


class FeedResponse(BaseModel):
    items: list[PostRead]
    next_cursor: str | None = None
