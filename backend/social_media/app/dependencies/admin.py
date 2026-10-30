"""Administrative authorization dependencies.

Roles are always re-read from the database for the authenticated user; no
role value from a request body, query string, or client store is trusted.
"""

from fastapi import Depends, HTTPException, status

from app.core.permissions import has_permission, is_admin_role
from app.dependencies.auth import get_current_user
from app.models.user import User


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not is_admin_role(current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required",
        )
    return current_user


def require_permission(permission: str):
    async def dependency(admin: User = Depends(get_current_admin)) -> User:
        if not has_permission(admin.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return admin

    return dependency
