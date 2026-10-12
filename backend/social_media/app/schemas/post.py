from pydantic import BaseModel, Field, field_validator


class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Post content cannot be blank")
        return value


class PostRead(PostCreate):
    id: int
    author_id: int
