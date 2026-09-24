from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import exists, func, select

from app.database.database import get_db
from app.dependencies import get_current_user

from app.models.comment import Comment
from app.models.creator_affinity import CreatorAffinity
from app.models.friend_request import FriendRequest
from app.models.like import Like
from app.models.post import Post
from app.models.save import Save
from app.models.share import Share
from app.models.user import User
from app.schemas.post import PostCreate

from app.services.post_service import (
    calculate_engagement,
    calculate_post_score,
    calculate_recency,
)


router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/all_posts", status_code=status.HTTP_200_OK)
async def get_all_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

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

    affinity_score = (
        select(CreatorAffinity.score)
        .where(
            CreatorAffinity.user_id == current_user.id,
            CreatorAffinity.creator_id == Post.user_id,
        )
        .correlate(Post)
        .scalar_subquery()
    )


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


    # --------------------------------
    # 6. Get posts
    # --------------------------------

    result = await db.execute(
        select(
            Post,
            User.username,
            like_count,
            comment_count,
            share_count,
            save_count,
            affinity_score,
            is_followed,
            liked_by_user,
            saved_by_user,
        ).join(User, User.id == Post.user_id)
    )


    # --------------------------------
    # 7. Rank posts
    # --------------------------------

    ranked_posts = []

    for (
        post,
        author,
        likes,
        comments,
        shares,
        saves,
        affinity,
        followed,
        liked,
        saved,
    ) in result.all():

        # Engagement
        engagement = calculate_engagement(
            likes=likes,
            comments=comments,
            shares=shares,
            saves=saves,
        )

        # Recency
        recency = calculate_recency(
            post.created_at
        )

        # Final score
        score = calculate_post_score(
            engagement=engagement,
            recency=recency,
            is_followed=followed,
        )

        ranked_posts.append(
            {
                "id": post.id,
                "user_id": post.user_id,
                "author": author,
                "content": post.content,
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
            }
        )


    # --------------------------------
    # 8. Sort highest score first
    # --------------------------------

    return sorted(
        ranked_posts,
        key=lambda post: post["score"],
        reverse=True,
    )

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  
): 
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
    return {
        "id": post.id,
        "user_id": post.user_id,
        "author": current_user.username,
        "content": post.content,
        "created_at": post.created_at,
        "like_count": 0,
        "comment_count": 0,
        "share_count": 0,
        "save_count": 0,
        "liked": False,
        "saved": False,
    }

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
    
