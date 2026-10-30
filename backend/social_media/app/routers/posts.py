from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from app.database.database import get_db
from app.dependencies import get_current_user

from app.models.post import Post
from app.models.post_image import PostImage
from app.models.post_video import PostVideo
from app.models.project import Project
from app.models.user import User
from app.schemas.post import PostCreate

from app.services.post_access import get_visible_post
from app.services.feed_service import load_feed_page
from app.services.feed_cache import invalidate_feed_cache


router = APIRouter(prefix="/posts", tags=["posts"])


def _project_preview(project: Project | None) -> dict | None:
    if project is None:
        return None
    return {
        "id": project.id,
        "title": project.title,
        "category": project.category or "",
        "status": project.status,
        "cover_url": f"/projects/{project.id}/cover",
    }


async def _resolve_project(
    db: AsyncSession, project_id: int | None, user: User
) -> Project | None:
    if project_id is None:
        return None
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="You can only share your own projects")
    return project


@router.get("/all_posts", status_code=status.HTTP_200_OK)
async def get_all_posts(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    author: str = Query(default="", max_length=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await load_feed_page(
        db,
        current_user,
        limit=limit,
        offset=offset,
        author=author.strip() or None,
    )


@router.post("/with-video", status_code=status.HTTP_201_CREATED)
async def create_post_with_video(
    content: str = Form("", max_length=5000),
    video: UploadFile = File(...),
    project_id: int | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = content.strip()
    project = await _resolve_project(db, project_id, current_user)
    if video.content_type not in {"video/mp4", "video/webm"}:
        raise HTTPException(status_code=415, detail="Upload an MP4 or WebM video")

    data = await video.read(25 * 1024 * 1024 + 1)
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Videos must be 25 MB or smaller")

    signatures_match = (
        data[4:8] == b"ftyp" if video.content_type == "video/mp4"
        else data.startswith(b"\x1a\x45\xdf\xa3")
    )
    if not signatures_match:
        raise HTTPException(status_code=415, detail="The uploaded file content does not match its video type")

    post = Post(
        user_id=current_user.id,
        content=content,
        project_id=project.id if project else None,
    )
    db.add(post)
    try:
        await db.flush()
        db.add(PostVideo(post_id=post.id, content_type=video.content_type, data=data))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have a post with this content")

    await db.refresh(post)
    await invalidate_feed_cache(current_user.id)
    return {
        "id": post.id,
        "feed_id": f"post-{post.id}",
        "user_id": post.user_id,
        "author": current_user.display_name or current_user.username,
        "username": current_user.username,
        "content": post.content,
        "video": f"/posts/{post.id}/video",
        "project": _project_preview(project),
        "created_at": post.created_at,
        "tick_count": 0,
        "ticked": False,
        "comment_count": 0,
        "share_count": 0,
        "save_count": 0,
        "saved": False,
        "shared": False,
    }


@router.get("/{post_id}/video")
async def get_post_video(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_visible_post(post_id, current_user, db)
    video = await db.get(PostVideo, post_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Post video not found")
    return Response(content=video.data, media_type=video.content_type)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    author_name = current_user.display_name or current_user.username
    project = await _resolve_project(db, post_data.project_id, current_user)
    post = Post(
        user_id=current_user.id,
        content=post_data.content,
        project_id=project.id if project else None,
    )
    db.add(post)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a post with this content",
        )
    await db.refresh(post)
    await invalidate_feed_cache(current_user.id)
    return {
        "id": post.id,
        "feed_id": f"post-{post.id}",
        "user_id": post.user_id,
        "author": author_name,
        "username": current_user.username,
        "content": post.content,
        "project": _project_preview(project),
        "created_at": post.created_at,
        "tick_count": 0,
        "ticked": False,
        "comment_count": 0,
        "share_count": 0,
        "save_count": 0,
        "saved": False,
        "shared": False,
    }


@router.post("/with-image", status_code=status.HTTP_201_CREATED)
async def create_post_with_image(
    content: str = Form("", max_length=5000),
    image: UploadFile = File(...),
    project_id: int | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = content.strip()
    project = await _resolve_project(db, project_id, current_user)
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if image.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, WebP, or GIF image")

    data = await image.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Post image must be 5 MB or smaller")

    valid_signatures = {
        "image/jpeg": data.startswith(b"\xff\xd8\xff"),
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": data.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    }
    if not valid_signatures[image.content_type]:
        raise HTTPException(status_code=415, detail="The uploaded file content does not match its image type")

    post = Post(
        user_id=current_user.id,
        content=content,
        project_id=project.id if project else None,
    )
    db.add(post)
    try:
        await db.flush()
        db.add(PostImage(post_id=post.id, content_type=image.content_type, data=data))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have a post with this content")

    await db.refresh(post)
    await invalidate_feed_cache(current_user.id)
    return {
        "id": post.id,
        "feed_id": f"post-{post.id}",
        "user_id": post.user_id,
        "author": current_user.display_name or current_user.username,
        "username": current_user.username,
        "content": post.content,
        "image": f"/posts/{post.id}/image",
        "project": _project_preview(project),
        "created_at": post.created_at,
        "tick_count": 0,
        "ticked": False,
        "comment_count": 0,
        "share_count": 0,
        "save_count": 0,
        "saved": False,
        "shared": False,
    }


@router.get("/{post_id}/image")
async def get_post_image(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_visible_post(post_id, current_user, db)
    image = await db.get(PostImage, post_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Post image not found")
    return Response(content=image.data, media_type=image.content_type)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or you do not have permission to delete it",
        )

    await db.delete(post)
    await db.commit()
    await invalidate_feed_cache(current_user.id)
