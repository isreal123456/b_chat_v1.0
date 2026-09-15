from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
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
from app.models.search_history import SearchHistory
from app.schemas.post import PostCreate

from app.schemas.post import PostCreate

from app.services.post_service import (
    calculate_engagement,
    calculate_post_score,
    calculate_recency,
    create_user_embedding,
    calculate_interest_score,
)


router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/all_posts", status_code=status.HTTP_200_OK)
async def get_all_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # --------------------------------
    # 1. Get user's search history
    # --------------------------------

    search_result = await db.execute(
        select(SearchHistory.query)
        .where(
            SearchHistory.user_id == current_user.id
        )
        .order_by(
            SearchHistory.created_at.desc()
        )
        .limit(20)
    )

    search_history = search_result.scalars().all()


    # --------------------------------
    # 2. Create user embedding ONCE
    # --------------------------------

    user_embedding = None

    if search_history:
        user_embedding = create_user_embedding(
            search_history
        )


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
            like_count,
            comment_count,
            share_count,
            save_count,
            affinity_score,
            is_followed,
        )
    )


    # --------------------------------
    # 7. Rank posts
    # --------------------------------

    ranked_posts = []

    for (
        post,
        likes,
        comments,
        shares,
        saves,
        affinity,
        followed,
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

        # Interest
        interest_score = 0.0

        if user_embedding is not None:
            interest_score = calculate_interest_score(
                user_embedding=user_embedding,
                post_text=post.content,
            )

        # Final score
        score = calculate_post_score(
            engagement=engagement,
            recency=recency,
            interest_affinity=interest_score,
            is_followed=followed,
        )

        ranked_posts.append(
            {
                "id": post.id,
                "user_id": post.user_id,
                "content": post.content,
                "created_at": post.created_at,

                "engagement": engagement,
                "recency": recency,
                "interest": interest_score,
                "followed": followed,

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

async def creeate_post(
    craetepost = PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  
): 
    post = Post(
        user_id=current_user.id,
        content=craetepost.content
            )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post



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
    
