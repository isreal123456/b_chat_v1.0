"""Persisted platform settings plus safe runtime defaults."""

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.admin_setting import AdminSetting
from app.models.user import User

DEFAULT_SETTINGS: dict[str, object] = {
    "maintenance_mode": False,
    "maintenance_message": "TickMe is getting an upgrade. Please check back soon.",
    "registration_enabled": True,
    "require_email_verification": False,
    "reports_enabled": True,
    "auto_hide_report_threshold": 3,
    "notify_admins_on_report": True,
    "notify_admins_on_signup": False,
}

SETTING_GROUPS = [
    {
        "id": "general",
        "label": "Platform",
        "description": "Registration and account verification behaviour.",
        "keys": ["registration_enabled", "require_email_verification"],
    },
    {
        "id": "moderation",
        "label": "Content moderation",
        "description": "How member reports enter the moderation queue.",
        "keys": ["reports_enabled", "auto_hide_report_threshold"],
    },
    {
        "id": "notifications",
        "label": "Admin notifications",
        "description": "When the moderation team should be alerted.",
        "keys": ["notify_admins_on_report", "notify_admins_on_signup"],
    },
    {
        "id": "maintenance",
        "label": "Maintenance",
        "description": "Temporarily pause the public app while keeping this console reachable.",
        "keys": ["maintenance_mode", "maintenance_message"],
    },
]

SETTING_META = {
    "registration_enabled": {
        "label": "Open registration",
        "description": "Allow new members to create accounts.",
    },
    "require_email_verification": {
        "label": "Require verified email to sign in",
        "description": "Block login until a member confirms their email address.",
    },
    "reports_enabled": {
        "label": "Accept member reports",
        "description": "Let members report users, posts, comments, and projects.",
    },
    "auto_hide_report_threshold": {
        "label": "Auto-hide threshold",
        "description": "Hide reported content after this many open reports. Set 0 to disable.",
    },
    "notify_admins_on_report": {
        "label": "Alert admins on new reports",
        "description": "Send an in-app notification to every active administrator.",
    },
    "notify_admins_on_signup": {
        "label": "Alert admins on new signups",
        "description": "Notify administrators whenever a new member joins.",
    },
    "maintenance_mode": {
        "label": "Maintenance mode",
        "description": "Public API routes return 503 while administrators keep console access.",
    },
    "maintenance_message": {
        "label": "Maintenance message",
        "description": "Message shown to members while maintenance mode is active.",
    },
}


def _coerce(key: str, raw: str):
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        return DEFAULT_SETTINGS.get(key)
    default = DEFAULT_SETTINGS.get(key)
    if isinstance(default, bool) and not isinstance(value, bool):
        return default
    if isinstance(default, int) and not isinstance(default, bool) and not isinstance(value, int):
        return default
    if isinstance(default, str) and not isinstance(value, str):
        return default
    return value


async def load_platform_settings(db: AsyncSession) -> dict:
    values = dict(DEFAULT_SETTINGS)
    result = await db.execute(select(AdminSetting))
    for row in result.scalars().all():
        if row.key in DEFAULT_SETTINGS:
            values[row.key] = _coerce(row.key, row.value)
    return values


async def get_platform_setting(db: AsyncSession, key: str):
    row = await db.get(AdminSetting, key)
    if row is None:
        return DEFAULT_SETTINGS.get(key)
    return _coerce(key, row.value)


async def save_platform_settings(
    db: AsyncSession, updates: dict, *, updated_by: int
) -> dict:
    for key, value in updates.items():
        if key not in DEFAULT_SETTINGS:
            continue
        row = await db.get(AdminSetting, key)
        encoded = json.dumps(value)
        if row is None:
            db.add(AdminSetting(key=key, value=encoded, updated_by=updated_by))
        else:
            row.value = encoded
            row.updated_by = updated_by
    await db.commit()
    return await load_platform_settings(db)


def public_setting_definitions() -> list[dict]:
    groups = []
    for group in SETTING_GROUPS:
        groups.append(
            {
                **group,
                "settings": [
                    {"key": key, "default": DEFAULT_SETTINGS[key], **SETTING_META.get(key, {})}
                    for key in group["keys"]
                ],
            }
        )
    return groups


async def bootstrap_super_admin(db: AsyncSession) -> User | None:
    """Promote the configured bootstrap account once, before any super admin exists."""

    email = settings.bootstrap_admin_email.strip().lower()
    if not email:
        return None
    existing = await db.scalar(select(User.id).where(User.role == "super_admin").limit(1))
    if existing is not None:
        return None
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        return None
    user.role = "super_admin"
    user.account_status = "active"
    await db.commit()
    return user
