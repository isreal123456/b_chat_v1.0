from fastapi import APIRouter
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.models.comment import Comment
from app.models.post import Post
from app.schemas.comment import CommentCreate, CommentResponse
from app.models.user import User
from app.dependencies import get_current_user
from app.services.post_access import get_visible_post
from app.services.notification_service import create_notification
from app.services.feed_cache import invalidate_feed_cache

router = APIRouter(prefix="/comments", tags=["comments"])

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = await get_visible_post(comment_data.post_id, current_user, db)

    author_name = current_user.display_name or current_user.username
    comment = Comment(
        content=comment_data.content,
        user_id=current_user.id,
        post_id=comment_data.post_id
    )
    db.add(comment)
    await create_notification(
        db, recipient_id=post.user_id, sender_id=current_user.id,
        kind="comment", message=f"{author_name} commented on your post",
        post_id=post.id,
    )
    await db.commit()
    await db.refresh(comment)
    await invalidate_feed_cache(current_user.id)

    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "content": comment.content,
        "user_id": comment.user_id,
        "author": author_name,
    }


@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Comment, User.display_name, User.username)
        .join(User, User.id == Comment.user_id)
        .where(Comment.id == comment_id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    comment, display_name, username = row
    await get_visible_post(comment.post_id, current_user, db)
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "content": comment.content,
        "user_id": comment.user_id,
        "author": display_name or username,
    }

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.user_id == current_user.id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you do not have permission to delete it"
        )

    await db.delete(comment)
    await db.commit()
    await invalidate_feed_cache(current_user.id)

@router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
async def get_comments_for_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_visible_post(post_id, current_user, db)
    result = await db.execute(
        select(Comment, User.display_name, User.username)
        .join(User, User.id == Comment.user_id)
        .where(Comment.post_id == post_id)
        .order_by(Comment.id)
    )
    comments = result.all()

    return [
        {
            "id": comment.id,
            "post_id": comment.post_id,
            "content": comment.content,
            "user_id": comment.user_id,
            "author": display_name or username,
        }
        for comment, display_name, username in comments
    ]
