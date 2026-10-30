from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

ProjectStatus = Literal["in_progress", "shipped", "archived"]
ProjectCategory = Literal["", "developer", "designer"]

URL_FIELDS = ("repo_url", "live_url")


def _clean_stack(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        label = " ".join(str(value).split())[:30]
        if not label or label.lower() in seen:
            continue
        seen.add(label.lower())
        cleaned.append(label)
        if len(cleaned) == 12:
            break
    return cleaned


def _validate_url(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Use a full http:// or https:// link")
    return value


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    tagline: str = Field(default="", max_length=160)
    description: str = Field(default="", max_length=4000)
    category: ProjectCategory = ""
    tech_stack: list[str] = Field(default_factory=list)
    repo_url: str = Field(default="", max_length=255)
    live_url: str = Field(default="", max_length=255)
    status: ProjectStatus = "in_progress"
    looking_for_collaborators: bool = False

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Give the project a title")
        return value

    @field_validator("tagline", "description")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("tech_stack")
    @classmethod
    def clean_tech_stack(cls, value: list[str]) -> list[str]:
        return _clean_stack(value)

    @field_validator(*URL_FIELDS)
    @classmethod
    def validate_url(cls, value: str) -> str:
        return _validate_url(value)


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    tagline: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    category: ProjectCategory | None = None
    tech_stack: list[str] | None = None
    repo_url: str | None = Field(default=None, max_length=255)
    live_url: str | None = Field(default=None, max_length=255)
    status: ProjectStatus | None = None
    looking_for_collaborators: bool | None = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Give the project a title")
        return value

    @field_validator("tagline", "description")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("tech_stack")
    @classmethod
    def clean_tech_stack(cls, value: list[str] | None) -> list[str] | None:
        return _clean_stack(value) if value is not None else None

    @field_validator(*URL_FIELDS)
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        return _validate_url(value) if value is not None else None
