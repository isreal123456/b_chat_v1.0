from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, EmailStr, Field, field_validator

ReportTarget = Literal["user", "post", "comment", "project"]
ReportReason = Literal[
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "inappropriate",
    "impersonation",
    "other",
]
ReportStatus = Literal["pending", "under_review", "resolved", "dismissed"]
Role = Literal["user", "moderator", "admin", "super_admin"]

ADMIN_URL_FIELDS = ("github_url", "portfolio_url", "linkedin_url")


class ReportCreate(BaseModel):
    target_type: ReportTarget
    target_id: int = Field(gt=0)
    reason: ReportReason
    details: str = Field(default="", max_length=1000)

    @field_validator("details")
    @classmethod
    def trim_details(cls, value: str) -> str:
        return value.strip()


class ReportUpdate(BaseModel):
    status: Literal["under_review", "resolved", "dismissed"]
    resolution_note: str = Field(default="", max_length=2000)
    resolution_action: Literal[
        "none", "content_removed", "user_suspended", "content_restored"
    ] = "none"

    @field_validator("resolution_note")
    @classmethod
    def trim_note(cls, value: str) -> str:
        return value.strip()


class AdminUserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = None
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
    email_verified: bool | None = None

    @field_validator("username", "name")
    @classmethod
    def trim_required(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("bio", "headline", "location")
    @classmethod
    def trim_optional(cls, value: str | None) -> str | None:
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

    @field_validator(*ADMIN_URL_FIELDS)
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


class AdminRoleUpdate(BaseModel):
    role: Role


class SuspendUserRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=255)

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value: str) -> str:
        return value.strip()


class DeleteUserRequest(BaseModel):
    confirm: str = Field(min_length=1, max_length=50)
    reason: str = Field(default="", max_length=255)


class ModerationReasonRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value: str) -> str:
        return value.strip()


class FeatureProjectRequest(BaseModel):
    featured: bool


class AdminSettingsUpdate(BaseModel):
    maintenance_mode: bool | None = None
    maintenance_message: str | None = Field(default=None, min_length=3, max_length=200)
    registration_enabled: bool | None = None
    require_email_verification: bool | None = None
    reports_enabled: bool | None = None
    auto_hide_report_threshold: int | None = Field(default=None, ge=0, le=100)
    notify_admins_on_report: bool | None = None
    notify_admins_on_signup: bool | None = None

    @field_validator("maintenance_message")
    @classmethod
    def trim_message(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None
