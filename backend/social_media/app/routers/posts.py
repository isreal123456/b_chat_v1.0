from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import exists, func, select

from app.database.database import get_db
from app.dependencies import get_current_user

from app.models.comment import Comment
from app.models.friend_request import FriendRequest
from app.models.like import Like
from app.models.post import Post
from app.models.post_image import PostImage
from app.models.post_video import PostVideo
from app.models.save import Save
from app.models.share import Share
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.schemas.post import PostCreate

from app.services.post_service import (
    calculate_engagement,
    calculate_post_score,
    calculate_recency,
)
from app.services.post_access import get_visible_post
from app.services.feed_cache import get_feed_cache, invalidate_feed_cache, set_feed_cache


router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/all_posts", status_code=status.HTTP_200_OK)
async def get_all_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"feed:all:v2:user:{current_user.id}"
    cached_posts = await get_feed_cache(cache_key)
    if cached_posts is not None:
        return cached_posts

    # --------------------------------
    # 3. Count engagement
    # --------------------------------

    like_count = (
        select(func.count(Like.id))
        .where(Like.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    comment_count = (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    share_count = (
        select(func.count(Share.id))
        .where(Share.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    save_count = (
        select(func.count(Save.id))
        .where(Save.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    liked_by_user = exists(
        select(Like.id).where(
            Like.post_id == Post.id,
            Like.user_id == current_user.id,
        )
    )

    saved_by_user = exists(
        select(Save.id).where(
            Save.post_id == Post.id,
            Save.user_id == current_user.id,
        )
    )


    # --------------------------------
    # 4. Creator affinity
    # --------------------------------

    # --------------------------------
    # 5. Check if user follows creator
    # --------------------------------

    is_followed = (
        exists(
            select(FriendRequest.id)
            .where(
                FriendRequest.status == "accepted",
                FriendRequest.sender_id == Post.user_id,
                FriendRequest.receiver_id == current_user.id,
            )
        )
        |
        exists(
            select(FriendRequest.id)
            .where(
                FriendRequest.status == "accepted",
                FriendRequest.sender_id == current_user.id,
                FriendRequest.receiver_id == Post.user_id,
            )
        )
    )

    has_image = exists(select(PostImage.post_id).where(PostImage.post_id == Post.id))
    has_video = exists(select(PostVideo.post_id).where(PostVideo.post_id == Post.id))

    is_private_creator = exists(
        select(UserPreferences.user_id).where(
            UserPreferences.user_id == Post.user_id,
            UserPreferences.private_account.is_(True),
        )
    )


    # --------------------------------
    # 6. Get posts
    # --------------------------------

    result = await db.execute(
        select(
            Post,
            User.username,
            User.display_name,
            like_count,
            comment_count,
            share_count,
            save_count,
            is_followed,
            liked_by_user,
            saved_by_user,
            has_image,
            has_video,
        ).join(User, User.id == Post.user_id).where(
            (Post.user_id == current_user.id) | (~is_private_creator) | is_followed
        )
    )


    # --------------------------------
    # 7. Rank posts
    # --------------------------------

    ranked_posts = []

    for (
        post,
        author,
        display_name,
        likes,
        comments,
        shares,
        saves,
        followed,
        liked,
        saved,
        image_present,
        video_present,
    ) in result.all():
        engagement = calculate_engagement(
            likes=likes,
            comments=comments,
            shares=shares,
            saves=saves,
        )
        recency = calculate_recency(post.created_at, half_life_hours=36.0, freshness_window_hours=3.0)
        score = calculate_post_score(
            engagement=engagement,
            recency=recency,
            is_followed=followed,
            is_own_post=post.user_id == current_user.id,
        )

        ranked_posts.append(
            {
                "id": post.id,
                "user_id": post.user_id,
                "author": display_name or author,
                "content": post.content,
                "image": f"/posts/{post.id}/image" if image_present else None,
                "video": f"/posts/{post.id}/video" if video_present else None,
                "created_at": post.created_at,

                "engagement": engagement,
                "recency": recency,
                "followed": followed,
                "like_count": likes,
                "comment_count": comments,
                "share_count": shares,
                "save_count": saves,
                "liked": liked,
                "saved": saved,

                "score": score,
                "sort_time": post.created_at,
            }
        )


    # --------------------------------
    # 8. Sort highest score first
    # --------------------------------

    ranked_posts.sort(
        key=lambda post: (post["score"], post["sort_time"]),
        reverse=True,
    )
    feed = [
        {key: value for key, value in post.items() if key != "sort_time"}
        for post in ranked_posts
    ]
    await set_feed_cache(cache_key, feed)
    return feed


@router.post("/with-video", status_code=status.HTTP_201_CREATED)
async def create_post_with_video(
    content: str = Form("", max_length=5000),
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = content.strip()
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

    post = Post(user_id=current_user.id, content=content)
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
        "user_id": post.user_id,
        "author": current_user.display_name or current_user.username,
        "content": post.content,
        "video": f"/posts/{post.id}/video",
        "created_at": post.created_at,
        "like_count": 0,
        "comment_count": 0,
        "share_count": 0,
        "save_count": 0,
        "liked": False,
        "saved": False,
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
    post = Post(
        user_id=current_user.id,
        content=post_data.content
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
        "user_id": post.user_id,
        "author": author_name,
        "content": post.content,
        "created_at": post.created_at,
        "like_count": 0,
        "comment_count": 0,
        "share_count": 0,
        "save_count": 0,
        "liked": False,
        "saved": False,
    }


@router.post("/with-image", status_code=status.HTTP_201_CREATED)
async def create_post_with_image(
    content: str = Form("", max_length=5000),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = content.strip()
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

    post = Post(user_id=current_user.id, content=content)
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
        "user_id": post.user_id,
        "author": current_user.display_name or current_user.username,
        "content": post.content,
        "image": f"/posts/{post.id}/image",
        "created_at": post.created_at,
        "like_count": 0,
        "comment_count": 0,
        "share_count": 0,
        "save_count": 0,
        "liked": False,
        "saved": False,
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
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or you do not have permission to delete it"
        )

    await db.delete(post)
    await db.commit()
    await invalidate_feed_cache(current_user.id)
    
