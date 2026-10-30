"""User serialization shared by profile, search, and follow endpoints."""

import json

from app.core.permissions import is_admin_role, permission_list
from app.models.user import User


def parse_skills(raw: str | None) -> list[str]:
    try:
        value = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.display_name or user.username,
        "bio": user.bio or "",
        "avatar_url": f"/users/{user.id}/avatar",
        "email_verified": bool(user.email_verified),
        "headline": user.headline or "",
        "category": user.category or "",
        "skills": parse_skills(user.skills),
        "github_url": user.github_url or "",
        "portfolio_url": user.portfolio_url or "",
        "linkedin_url": user.linkedin_url or "",
        "location": user.location or "",
        "available_for_work": bool(user.available_for_work),
        "onboarded": bool(user.onboarded),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "role": user.role or "user",
        "admin_role": user.role if is_admin_role(user.role) else None,
        "admin_permissions": permission_list(user.role) if is_admin_role(user.role) else [],
        "account_status": user.account_status or "active",
        "terms_accepted_at": user.terms_accepted_at.isoformat() if user.terms_accepted_at else None,
        "terms_version": user.terms_version or "",
        "privacy_version": user.privacy_version or "",
    }


def serialize_public_user(user: User, *, is_following: bool = False) -> dict:
    data = serialize_user(user)
    data.pop("email", None)
    data.pop("admin_permissions", None)
    data.pop("terms_accepted_at", None)
    data.pop("terms_version", None)
    data.pop("privacy_version", None)
    data["is_following"] = is_following
    return data
