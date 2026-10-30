"""Project showcase: CRUD, cover images, and per-profile project lists."""

import json

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import is_admin_role
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.project import Project
from app.models.project_image import ProjectImage
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.project_service import (
    get_collaborator_counts,
    get_collaborators,
    get_viewer_collaboration_statuses,
)

router = APIRouter(tags=["projects"])

MAX_COVER_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def parse_stack(raw: str | None) -> list[str]:
    try:
        value = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


def serialize_project(
    project: Project,
    owner: User,
    *,
    viewer_id: int,
    collaborator_count: int = 0,
    collaboration_status: str = "none",
) -> dict:
    return {
        "id": project.id,
        "title": project.title,
        "tagline": project.tagline or "",
        "description": project.description or "",
        "category": project.category or "",
        "tech_stack": parse_stack(project.tech_stack),
        "repo_url": project.repo_url or "",
        "live_url": project.live_url or "",
        "status": project.status,
        "looking_for_collaborators": bool(project.looking_for_collaborators),
        "cover_url": f"/projects/{project.id}/cover",
        "featured": bool(project.featured),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "is_owner": project.owner_id == viewer_id,
        "collaborator_count": collaborator_count,
        "collaboration_status": "owner" if project.owner_id == viewer_id else collaboration_status,
        "owner": {
            "id": owner.id,
            "username": owner.username,
            "name": owner.display_name or owner.username,
            "avatar_url": f"/users/{owner.id}/avatar",
            "category": owner.category or "",
            "headline": owner.headline or "",
        },
    }


async def _load_project(db: AsyncSession, project_id: int) -> tuple[Project, User]:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    owner = await db.get(User, project.owner_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Project owner not found")
    return project, owner


def _require_owner(project: Project, viewer: User) -> None:
    if project.owner_id != viewer.id:
        raise HTTPException(status_code=403, detail="You can only manage your own projects")


@router.get("/projects")
async def list_projects(
    query: str = Query(default="", max_length=80),
    category: str = Query(default="", max_length=20),
    status_filter: str = Query(default="", alias="status", max_length=20),
    username: str = Query(default="", max_length=50),
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    statement = (
        select(Project, User)
        .join(User, User.id == Project.owner_id)
        .where(
            Project.moderation_status == "published",
            User.account_status == "active",
        )
    )
    if query.strip():
        pattern = f"%{query.strip()}%"
        statement = statement.where(
            or_(
                Project.title.ilike(pattern),
                Project.tagline.ilike(pattern),
                Project.tech_stack.ilike(pattern),
            )
        )
    if category in {"developer", "designer"}:
        statement = statement.where(Project.category == category)
    if status_filter in {"in_progress", "shipped", "archived"}:
        statement = statement.where(Project.status == status_filter)
    if username.strip():
        statement = statement.where(User.username == username.strip())

    total = await db.scalar(
        select(func.count()).select_from(statement.order_by(None).subquery())
    )

    result = await db.execute(
        statement.order_by(
            Project.featured.desc(),
            Project.created_at.desc(),
            Project.id.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    project_ids = [project.id for project, _owner in rows]
    counts = await get_collaborator_counts(db, project_ids)
    viewer_statuses = await get_viewer_collaboration_statuses(
        db, current_user.id, project_ids
    )
    items = [
        serialize_project(
            project,
            owner,
            viewer_id=current_user.id,
            collaborator_count=counts.get(project.id, 0),
            collaboration_status=viewer_statuses.get(project.id, "none"),
        )
        for project, owner in rows
    ]
    return {
        "items": items,
        "total": int(total or 0),
        "limit": limit,
        "offset": offset,
    }


@router.get("/users/{username}/projects")
async def list_user_projects(
    username: str,
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    owner = await db.scalar(select(User).where(User.username == username))
    if owner is None or (
        owner.account_status != "active" and not is_admin_role(current_user.role)
    ):
        raise HTTPException(status_code=404, detail="User not found")

    total = await db.scalar(
        select(func.count())
        .select_from(Project)
        .where(
            Project.owner_id == owner.id,
            Project.moderation_status == "published",
        )
    )
    result = await db.execute(
        select(Project)
        .where(
            Project.owner_id == owner.id,
            Project.moderation_status == "published",
        )
        .order_by(Project.created_at.desc(), Project.id.desc())
        .limit(limit)
        .offset(offset)
    )
    projects = list(result.scalars().all())
    project_ids = [project.id for project in projects]
    counts = await get_collaborator_counts(db, project_ids)
    viewer_statuses = await get_viewer_collaboration_statuses(
        db, current_user.id, project_ids
    )
    return {
        "items": [
            serialize_project(
                project,
                owner,
                viewer_id=current_user.id,
                collaborator_count=counts.get(project.id, 0),
                collaboration_status=viewer_statuses.get(project.id, "none"),
            )
            for project in projects
        ],
        "total": int(total or 0),
        "limit": limit,
        "offset": offset,
    }


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        owner_id=current_user.id,
        title=payload.title,
        tagline=payload.tagline,
        description=payload.description,
        category=payload.category,
        tech_stack=json.dumps(payload.tech_stack),
        repo_url=payload.repo_url,
        live_url=payload.live_url,
        status=payload.status,
        looking_for_collaborators=payload.looking_for_collaborators,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return serialize_project(project, current_user, viewer_id=current_user.id)


@router.get("/projects/{project_id}")
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, owner = await _load_project(db, project_id)
    if (
        (project.moderation_status or "published") != "published"
        and not is_admin_role(current_user.role)
    ):
        raise HTTPException(status_code=404, detail="Project not found")
    counts = await get_collaborator_counts(db, [project.id])
    statuses = await get_viewer_collaboration_statuses(db, current_user.id, [project.id])
    collaborators = await get_collaborators(db, project.id, limit=12)

    data = serialize_project(
        project,
        owner,
        viewer_id=current_user.id,
        collaborator_count=counts.get(project.id, 0),
        collaboration_status=statuses.get(project.id, "none"),
    )
    data["collaborators"] = [
        {
            "id": user.id,
            "username": user.username,
            "name": user.display_name or user.username,
            "avatar_url": f"/users/{user.id}/avatar",
            "category": user.category or "",
            "headline": user.headline or "",
        }
        for user in collaborators
    ]
    return data


@router.patch("/projects/{project_id}")
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, owner = await _load_project(db, project_id)
    _require_owner(project, current_user)

    updates = payload.model_dump(exclude_unset=True)
    if "tech_stack" in updates:
        project.tech_stack = json.dumps(updates.pop("tech_stack"))
    for field, value in updates.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return serialize_project(project, owner, viewer_id=current_user.id)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, _ = await _load_project(db, project_id)
    _require_owner(project, current_user)
    cover = await db.get(ProjectImage, project.id)
    if cover is not None:
        await db.delete(cover)
    await db.delete(project)
    await db.commit()


@router.put("/projects/{project_id}/cover")
async def upload_cover(
    project_id: int,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, _ = await _load_project(db, project_id)
    _require_owner(project, current_user)

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, WebP, or GIF image")

    data = await image.read(MAX_COVER_BYTES + 1)
    if len(data) > MAX_COVER_BYTES:
        raise HTTPException(status_code=413, detail="Cover image must be 5 MB or smaller")

    valid = {
        "image/jpeg": data.startswith(b"\xff\xd8\xff"),
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": data.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    }
    if not valid[image.content_type]:
        raise HTTPException(status_code=415, detail="The uploaded file content does not match its image type")

    cover = await db.get(ProjectImage, project.id)
    if cover is None:
        cover = ProjectImage(project_id=project.id, content_type=image.content_type, data=data)
        db.add(cover)
    else:
        cover.content_type = image.content_type
        cover.data = data

    await db.commit()
    return {"cover_url": f"/projects/{project.id}/cover"}


@router.get("/projects/{project_id}/cover")
async def get_cover(project_id: int, db: AsyncSession = Depends(get_db)):
    cover = await db.get(ProjectImage, project_id)
    if cover is None:
        raise HTTPException(status_code=404, detail="Cover image not found")
    return Response(content=cover.data, media_type=cover.content_type)


@router.delete("/projects/{project_id}/cover", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cover(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, _ = await _load_project(db, project_id)
    _require_owner(project, current_user)
    cover = await db.get(ProjectImage, project.id)
    if cover is not None:
        await db.delete(cover)
        await db.commit()
