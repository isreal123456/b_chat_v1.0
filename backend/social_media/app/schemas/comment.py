from pydantic import BaseModel, Field, field_validator


class CommentCreate(BaseModel):
    post_id: int
    content: str = Field(min_length=1, max_length=500)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Comment cannot be blank")
        return value


class CommentResponse(CommentCreate):
    id: int
    user_id: int
    author: str

    model_config = {"from_attributes": True}
