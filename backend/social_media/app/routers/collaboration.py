"""Build Together: collaboration requests between builders and project owners."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.collaboration_request import CollaborationRequest
from app.models.project import Project
from app.models.user import User
from app.schemas.collaboration import CollaborationRequestCreate
from app.services.notification_service import create_notification
from app.services.project_service import (
    get_collaborators,
    serialize_collaboration_request,
)

router = APIRouter(tags=["collaboration"])


async def _load_project(db: AsyncSession, project_id: int) -> Project:
    project = await db.get(Project, project_id)
    if project is None or (project.moderation_status or "published") != "published":
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _load_request(
    db: AsyncSession, project_id: int, request_id: int
) -> CollaborationRequest:
    request = await db.get(CollaborationRequest, request_id)
    if request is None or request.project_id != project_id:
        raise HTTPException(status_code=404, detail="Collaboration request not found")
    return request


@router.post(
    "/projects/{project_id}/collaboration-requests",
    status_code=status.HTTP_201_CREATED,
)
async def create_collaboration_request(
    project_id: int,
    payload: CollaborationRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id)

    if project.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this project")
    if not project.looking_for_collaborators:
        raise HTTPException(
            status_code=400, detail="This project is not accepting collaborators right now"
        )

    existing = await db.scalar(
        select(CollaborationRequest).where(
            CollaborationRequest.project_id == project.id,
            CollaborationRequest.requester_id == current_user.id,
        )
    )
    if existing is not None and existing.status == "pending":
        raise HTTPException(status_code=409, detail="You already sent a request for this project")
    if existing is not None and existing.status == "accepted":
        raise HTTPException(status_code=400, detail="You are already a collaborator")

    if existing is not None:
        existing.message = payload.message
        existing.role = payload.role
        existing.status = "pending"
    else:
        db.add(
            CollaborationRequest(
                project_id=project.id,
                requester_id=current_user.id,
                message=payload.message,
                role=payload.role,
            )
        )

    await create_notification(
        db,
        recipient_id=project.owner_id,
        sender_id=current_user.id,
        kind="collaboration_request",
        message=f"{current_user.display_name or current_user.username} wants to collaborate on {project.title}",
    )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="You already sent a request for this project")

    return {"message": "Collaboration request sent"}


@router.get("/projects/{project_id}/collaboration-requests")
async def list_project_requests(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can view requests")

    result = await db.execute(
        select(CollaborationRequest, User)
        .join(User, User.id == CollaborationRequest.requester_id)
        .where(
            CollaborationRequest.project_id == project.id,
            CollaborationRequest.status == "pending",
        )
        .order_by(CollaborationRequest.created_at.desc(), CollaborationRequest.id.desc())
    )
    return [
        serialize_collaboration_request(request, project, user)
        for request, user in result.all()
    ]


@router.get("/collaboration-requests/received")
async def list_received_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CollaborationRequest, Project, User)
        .join(Project, Project.id == CollaborationRequest.project_id)
        .join(User, User.id == CollaborationRequest.requester_id)
        .where(
            Project.owner_id == current_user.id,
            Project.moderation_status == "published",
            CollaborationRequest.status == "pending",
        )
        .order_by(CollaborationRequest.created_at.desc(), CollaborationRequest.id.desc())
    )
    return [
        serialize_collaboration_request(request, project, requester)
        for request, project, requester in result.all()
    ]


@router.get("/collaboration-requests/sent")
async def list_sent_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CollaborationRequest, Project)
        .join(Project, Project.id == CollaborationRequest.project_id)
        .where(
            CollaborationRequest.requester_id == current_user.id,
            Project.moderation_status == "published",
            CollaborationRequest.status == "pending",
        )
        .order_by(CollaborationRequest.created_at.desc(), CollaborationRequest.id.desc())
    )
    return [
        serialize_collaboration_request(request, project, current_user)
        for request, project in result.all()
    ]


@router.patch("/projects/{project_id}/collaboration-requests/{request_id}/accept")
async def accept_request(
    project_id: int,
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can accept requests")

    request = await _load_request(db, project_id, request_id)
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="This request is no longer pending")

    request.status = "accepted"
    await create_notification(
        db,
        recipient_id=request.requester_id,
        sender_id=current_user.id,
        kind="collaboration_accepted",
        message=f"{current_user.display_name or current_user.username} added you to {project.title}",
    )
    await db.commit()
    return {"message": "Collaboration request accepted"}


@router.patch("/projects/{project_id}/collaboration-requests/{request_id}/reject")
async def reject_request(
    project_id: int,
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can decline requests")

    request = await _load_request(db, project_id, request_id)
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="This request is no longer pending")

    request.status = "rejected"
    await db.commit()
    return {"message": "Collaboration request declined"}


@router.delete(
    "/projects/{project_id}/collaboration-requests/{request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_request(
    project_id: int,
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id)
    request = await _load_request(db, project_id, request_id)

    if request.requester_id != current_user.id and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot delete this request")

    await db.delete(request)
    await db.commit()


@router.get("/projects/{project_id}/collaborators")
async def list_collaborators(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _load_project(db, project_id)
    collaborators = await get_collaborators(db, project_id)
    return [
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


@router.delete(
    "/projects/{project_id}/collaborators/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_collaborator(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id)
    if project.owner_id != current_user.id and user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the owner or the collaborator can remove this member"
        )

    request = await db.scalar(
        select(CollaborationRequest).where(
            CollaborationRequest.project_id == project.id,
            CollaborationRequest.requester_id == user_id,
            CollaborationRequest.status == "accepted",
        )
    )
    if request is None:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    await db.delete(request)
    await db.commit()
