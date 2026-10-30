from pydantic import BaseModel, Field, field_validator


class CollaborationRequestCreate(BaseModel):
    message: str = Field(default="", max_length=300)
    role: str = Field(default="", max_length=60)

    @field_validator("message", "role")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()
