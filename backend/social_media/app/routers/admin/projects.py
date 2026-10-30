"""Project moderation and collaboration oversight endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.admin import require_permission
from app.models.collaboration_request import CollaborationRequest
from app.models.post import Post
from app.models.project import Project
from app.models.report import Report
from app.models.user import User
from app.routers.admin.common import counts_for, paginated, paging
from app.schemas.admin import FeatureProjectRequest, ModerationReasonRequest
from app.services.admin_service import (
    record_admin_action,
    serialize_admin_project,
    serialize_reports,
)
from app.services.moderation_service import remove_content, restore_content

router = APIRouter()

OPEN_REPORT_STATUSES = ("pending", "under_review")


async def _project_items(db: AsyncSession, projects: list[Project]) -> list[dict]:
    ids = [project.id for project in projects]
    posts = await counts_for(
        db, Post, Post.project_id, ids, Post.moderation_status == "published"
    )
    collaborators = await counts_for(
        db, CollaborationRequest, CollaborationRequest.project_id, ids,
        CollaborationRequest.status == "accepted",
    )
    pending = await counts_for(
        db, CollaborationRequest, CollaborationRequest.project_id, ids,
        CollaborationRequest.status == "pending",
    )
    reports = await counts_for(
        db, Report, Report.target_id, ids, Report.target_type == "project"
    )
    owner_ids = {project.owner_id for project in projects}
    owners = {}
    if owner_ids:
        rows = await db.execute(select(User).where(User.id.in_(owner_ids)))
        owners = {user.id: user for user in rows.scalars().all()}
    return [
        serialize_admin_project(
            project,
            owners.get(project.owner_id),
            collaborator_count=collaborators.get(project.id, 0),
            pending_collaboration_count=pending.get(project.id, 0),
            post_count=posts.get(project.id, 0),
            report_count=reports.get(project.id, 0),
        )
        for project in projects
    ]


@router.get("/projects")
async def list_projects(
    q: str = Query(default="", max_length=200),
    status: str = Query(default=""),
    featured: bool | None = Query(default=None),
    owner_id: int | None = Query(default=None),
    reported: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("projects.view")),
):
    filters = []
    query = q.strip()
    if query:
        pattern = f"%{query}%"
        filters.append(or_(Project.title.ilike(pattern), Project.tagline.ilike(pattern)))
    if status in {"published", "removed"}:
        filters.append(Project.moderation_status == status)
    if featured is not None:
        filters.append(Project.featured.is_(featured))
    if owner_id:
        filters.append(Project.owner_id == owner_id)
    if reported:
        filters.append(
            select(Report.id)
            .where(
                Report.target_type == "project",
                Report.target_id == Project.id,
                Report.status.in_(OPEN_REPORT_STATUSES),
            )
            .exists()
        )

    page_size, offset = paging(page, page_size)
    total = int(await db.scalar(select(func.count(Project.id)).where(*filters)) or 0)
    projects = (
        await db.execute(
            select(Project)
            .where(*filters)
            .order_by(Project.featured.desc(), Project.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()
    return paginated(await _project_items(db, list(projects)), total, page, page_size)


@router.get("/projects/{project_id}")
async def project_detail(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("projects.view")),
):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    item = (await _project_items(db, [project]))[0]
    requests = (
        await db.execute(
            select(CollaborationRequest)
            .where(CollaborationRequest.project_id == project.id)
            .order_by(CollaborationRequest.created_at.desc())
            .limit(30)
        )
    ).scalars().all()
    requester_ids = {request.requester_id for request in requests}
    requesters = {}
    if requester_ids:
        rows = await db.execute(select(User).where(User.id.in_(requester_ids)))
        requesters = {user.id: user for user in rows.scalars().all()}
    reports = (
        await db.execute(
            select(Report)
            .where(Report.target_type == "project", Report.target_id == project.id)
            .order_by(Report.created_at.desc())
        )
    ).scalars().all()

    return {
        **item,
        "collaboration_requests": [
            {
                "id": request.id,
                "requester": {
                    "id": requesters[request.requester_id].id,
                    "username": requesters[request.requester_id].username,
                    "name": requesters[request.requester_id].display_name
                    or requesters[request.requester_id].username,
                }
                if request.requester_id in requesters
                else None,
                "role": request.role or "",
                "message": request.message or "",
                "status": request.status,
                "created_at": request.created_at.isoformat() if request.created_at else None,
            }
            for request in requests
        ],
        "reports": await serialize_reports(db, list(reports)),
    }


@router.post("/projects/{project_id}/remove")
async def remove_project(
    project_id: int,
    payload: ModerationReasonRequest,
    admin: User = Depends(require_permission("projects.moderate")),
    db: AsyncSession = Depends(get_db),
):
    target = await remove_content(
        db,
        target_type="project",
        target_id=project_id,
        reason=payload.reason,
        admin=admin,
    )
    if target.featured:
        target.featured = False
        target.featured_at = None
    await db.commit()
    owner = await db.get(User, target.owner_id)
    return serialize_admin_project(target, owner)


@router.post("/projects/{project_id}/restore")
async def restore_project(
    project_id: int,
    admin: User = Depends(require_permission("projects.moderate")),
    db: AsyncSession = Depends(get_db),
):
    target = await restore_content(
        db, target_type="project", target_id=project_id, admin=admin
    )
    await db.commit()
    owner = await db.get(User, target.owner_id)
    return serialize_admin_project(target, owner)


@router.post("/projects/{project_id}/feature")
async def feature_project(
    project_id: int,
    payload: FeatureProjectRequest,
    admin: User = Depends(require_permission("projects.feature")),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.featured:
        if (project.moderation_status or "published") != "published":
            raise HTTPException(
                status_code=400, detail="Restore this project before featuring it"
            )
        if project.featured:
            raise HTTPException(status_code=409, detail="This project is already featured")
        project.featured = True
        project.featured_at = datetime.utcnow()
        action = "project.feature"
        summary = f"Project “{project.title}” featured"
    else:
        if not project.featured:
            raise HTTPException(status_code=409, detail="This project is not featured")
        project.featured = False
        project.featured_at = None
        action = "project.unfeature"
        summary = f"Project “{project.title}” removed from featured"

    await record_admin_action(
        db,
        admin,
        action=action,
        target_type="project",
        target_id=project.id,
        summary=summary,
    )
    await db.commit()
    owner = await db.get(User, project.owner_id)
    return serialize_admin_project(project, owner)
