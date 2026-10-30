from pydantic import BaseModel, ConfigDict


class TickRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    user_id: int
    tick_count: int


class TickCountRead(BaseModel):
    post_id: int
    tick_count: int
    ticked: bool


class TickedPostsRead(BaseModel):
    user_id: int
    ticked_posts: list[int]
