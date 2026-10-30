"""Project collaboration queries shared by the projects and collaboration routers."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collaboration_request import CollaborationRequest
from app.models.user import User


async def get_collaborator_counts(
    db: AsyncSession, project_ids: list[int]
) -> dict[int, int]:
    if not project_ids:
        return {}
    result = await db.execute(
        select(CollaborationRequest.project_id, func.count(CollaborationRequest.id))
        .where(
            CollaborationRequest.project_id.in_(project_ids),
            CollaborationRequest.status == "accepted",
        )
        .group_by(CollaborationRequest.project_id)
    )
    return {project_id: int(count) for project_id, count in result.all()}


async def get_viewer_collaboration_statuses(
    db: AsyncSession, viewer_id: int, project_ids: list[int]
) -> dict[int, str]:
    if not project_ids:
        return {}
    result = await db.execute(
        select(CollaborationRequest.project_id, CollaborationRequest.status).where(
            CollaborationRequest.requester_id == viewer_id,
            CollaborationRequest.project_id.in_(project_ids),
        )
    )
    statuses = {}
    for project_id, status in result.all():
        statuses[project_id] = status if status in {"pending", "accepted"} else "none"
    return statuses


async def get_collaborators(
    db: AsyncSession, project_id: int, *, limit: int | None = None
) -> list[User]:
    statement = (
        select(User)
        .join(CollaborationRequest, CollaborationRequest.requester_id == User.id)
        .where(
            CollaborationRequest.project_id == project_id,
            CollaborationRequest.status == "accepted",
        )
        .order_by(CollaborationRequest.updated_at.desc(), CollaborationRequest.id.desc())
    )
    if limit is not None:
        statement = statement.limit(limit)
    result = await db.execute(statement)
    return list(result.scalars().all())


def serialize_collaboration_request(
    request: CollaborationRequest, project, requester: User
) -> dict:
    return {
        "id": request.id,
        "status": request.status,
        "message": request.message or "",
        "role": request.role or "",
        "created_at": request.created_at.isoformat() if request.created_at else None,
        "project": {
            "id": project.id,
            "title": project.title,
            "cover_url": f"/projects/{project.id}/cover",
            "category": project.category or "",
            "status": project.status,
        },
        "user": {
            "id": requester.id,
            "username": requester.username,
            "name": requester.display_name or requester.username,
            "avatar_url": f"/users/{requester.id}/avatar",
            "category": requester.category or "",
            "headline": requester.headline or "",
        },
    }
