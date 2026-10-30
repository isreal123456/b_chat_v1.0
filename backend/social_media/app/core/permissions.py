"""Administrative roles and the permissions enforced by the API layer."""

ADMIN_ROLES = frozenset({"super_admin", "admin", "moderator"})
ROLE_LABELS = {
    "user": "Member",
    "moderator": "Moderator",
    "admin": "Admin",
    "super_admin": "Super Admin",
}

PERMISSIONS: dict[str, frozenset[str]] = {
    "super_admin": frozenset(
        {
            "dashboard.view",
            "analytics.view",
            "users.view",
            "users.manage",
            "users.delete",
            "content.view",
            "content.moderate",
            "projects.view",
            "projects.moderate",
            "projects.feature",
            "reports.view",
            "reports.manage",
            "settings.view",
            "settings.manage",
            "admins.manage",
            "activity.view",
        }
    ),
    "admin": frozenset(
        {
            "dashboard.view",
            "analytics.view",
            "users.view",
            "users.manage",
            "content.view",
            "content.moderate",
            "projects.view",
            "projects.moderate",
            "projects.feature",
            "reports.view",
            "reports.manage",
            "settings.view",
            "activity.view",
        }
    ),
    "moderator": frozenset(
        {
            "dashboard.view",
            "users.view",
            "content.view",
            "content.moderate",
            "projects.view",
            "projects.moderate",
            "reports.view",
            "reports.manage",
        }
    ),
}


def is_admin_role(role: str | None) -> bool:
    return (role or "user") in ADMIN_ROLES


def has_permission(role: str | None, permission: str) -> bool:
    return permission in PERMISSIONS.get(role or "user", frozenset())


def permission_list(role: str | None) -> list[str]:
    return sorted(PERMISSIONS.get(role or "user", frozenset()))
