from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


URL_FIELDS = ("github_url", "portfolio_url", "linkedin_url")


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=160)
    headline: str | None = Field(default=None, max_length=120)
    category: Literal["", "developer", "designer"] | None = None
    skills: list[str] | None = None
    github_url: str | None = Field(default=None, max_length=255)
    portfolio_url: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=100)
    available_for_work: bool | None = None
    onboarded: bool | None = None

    @field_validator("username", "name")
    @classmethod
    def trim_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("bio", "headline", "location")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("skills")
    @classmethod
    def clean_skills(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned: list[str] = []
        seen: set[str] = set()
        for skill in value:
            label = " ".join(str(skill).split())[:30]
            if not label or label.lower() in seen:
                continue
            seen.add(label.lower())
            cleaned.append(label)
            if len(cleaned) == 20:
                break
        return cleaned

    @field_validator(*URL_FIELDS)
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return ""
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Use a full http:// or https:// link")
        return value


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
