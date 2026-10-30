"""Feed assembly and personalised ranking for TickMe.

Ranking v2 blends engagement, recency, network, interest overlap, and the
viewer's own interaction history with each creator. Every signal comes from
data the product already stores, so the feed stays explainable.
"""

import json
import math
from typing import Any

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.block import Block
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.friend_request import FriendRequest
from app.models.post import Post
from app.models.post_image import PostImage
from app.models.post_video import PostVideo
from app.models.project import Project
from app.models.save import Save
from app.models.share import Share
from app.models.tick import Tick
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.services.feed_cache import (
    feed_cache_key,
    get_feed_cache,
    set_feed_cache,
)
from app.services.post_service import calculate_engagement, calculate_recency

ENGAGEMENT_WEIGHT = 0.24
RECENCY_WEIGHT = 0.32
FOLLOW_WEIGHT = 0.15
OWN_POST_WEIGHT = 0.04
INTEREST_WEIGHT = 0.15
AFFINITY_WEIGHT = 0.10

_SHARE_LIMIT = 40


def _skill_set(raw: Any) -> set[str]:
    if isinstance(raw, str):
        try:
            values = json.loads(raw or "[]")
        except (TypeError, ValueError):
            values = []
    elif isinstance(raw, (list, tuple)):
        values = raw
    else:
        values = []
    return {str(item).strip().lower() for item in values if str(item).strip()}


def calculate_interest_match(
    viewer_skills: set[str],
    author_skills: set[str],
    viewer_category: str,
    author_category: str,
    project_category: str = "",
) -> float:
    """How close a creator's craft is to what the viewer cares about."""

    overlap = 0.0
    if viewer_skills and author_skills:
        overlap = len(viewer_skills & author_skills) / len(viewer_skills)

    viewer_category = (viewer_category or "").strip().lower()
    author_category = (author_category or "").strip().lower()
    project_category = (project_category or "").strip().lower()

    category_match = 1.0 if viewer_category and viewer_category == author_category else 0.0
    project_match = 1.0 if viewer_category and viewer_category == project_category else 0.0

    score = 0.60 * min(overlap, 1.0) + 0.25 * category_match + 0.15 * project_match
    return round(min(max(score, 0.0), 1.0), 4)


def calculate_behavioral_affinity(weight: int) -> float:
    """Normalise historical interactions with a creator into 0..1."""

    if weight <= 0:
        return 0.0
    return round(min(1.0, math.log1p(weight) / math.log1p(24)), 4)


def calculate_feed_score(
    *,
    engagement: float,
    recency: float,
    is_followed: bool,
    is_own_post: bool,
    interest_match: float,
    affinity: float,
) -> float:
    engagement_score = 1 - math.exp(-max(engagement, 0.0) / 3)
    recency_score = min(max(recency, 0.0), 1.0)

    return (
        engagement_score * ENGAGEMENT_WEIGHT
        + recency_score * RECENCY_WEIGHT
        + (1.0 if is_followed else 0.0) * FOLLOW_WEIGHT
        + (1.0 if is_own_post else 0.0) * OWN_POST_WEIGHT
        + min(max(interest_match, 0.0), 1.0) * INTEREST_WEIGHT
        + min(max(affinity, 0.0), 1.0) * AFFINITY_WEIGHT
    )


async def _load_affinity_weights(db: AsyncSession, viewer_id: int) -> dict[int, int]:
    """Weighted historical interactions per creator (comments and saves count double)."""

    weights: dict[int, int] = {}

    tick_rows = await db.execute(
        select(Post.user_id, func.count(Tick.id))
        .join(Tick, Tick.post_id == Post.id)
        .where(Tick.user_id == viewer_id)
        .group_by(Post.user_id)
    )
    for author_id, count in tick_rows.all():
        weights[author_id] = weights.get(author_id, 0) + int(count)

    comment_rows = await db.execute(
        select(Post.user_id, func.count(Comment.id))
        .join(Comment, Comment.post_id == Post.id)
        .where(Comment.user_id == viewer_id)
        .group_by(Post.user_id)
    )
    for author_id, count in comment_rows.all():
        weights[author_id] = weights.get(author_id, 0) + int(count) * 2

    save_rows = await db.execute(
        select(Post.user_id, func.count(Save.id))
        .join(Save, Save.post_id == Post.id)
        .where(Save.user_id == viewer_id)
        .group_by(Post.user_id)
    )
    for author_id, count in save_rows.all():
        weights[author_id] = weights.get(author_id, 0) + int(count) * 2

    return weights


def _author_preview(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "name": user.display_name or user.username,
        "avatar_url": f"/users/{user.id}/avatar",
    }


def _project_preview(project: Project) -> dict:
    return {
        "id": project.id,
        "title": project.title,
        "category": project.category or "",
        "status": project.status,
        "cover_url": f"/projects/{project.id}/cover",
    }


async def _build_feed_items(
    db: AsyncSession,
    viewer: User,
    *,
    author: str | None = None,
) -> list[dict]:
    tick_count = (
        select(func.count(Tick.id))
        .where(Tick.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )
    comment_count = (
        select(func.count(Comment.id))
        .where(
            Comment.post_id == Post.id,
            Comment.moderation_status == "published",
        )
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
    ticked_by_user = exists(
        select(Tick.id).where(Tick.post_id == Post.id, Tick.user_id == viewer.id)
    )
    saved_by_user = exists(
        select(Save.id).where(Save.post_id == Post.id, Save.user_id == viewer.id)
    )
    shared_by_user = exists(
        select(Share.id).where(Share.post_id == Post.id, Share.user_id == viewer.id)
    )

    # A creator counts as followed when the viewer follows them or when the two
    # are connected, so accepted connections keep their feed boost.
    is_followed = (
        exists(
            select(Follow.id).where(
                Follow.follower_id == viewer.id,
                Follow.following_id == Post.user_id,
            )
        )
        | exists(
            select(FriendRequest.id).where(
                FriendRequest.status == "accepted",
                FriendRequest.sender_id == Post.user_id,
                FriendRequest.receiver_id == viewer.id,
            )
        )
        | exists(
            select(FriendRequest.id).where(
                FriendRequest.status == "accepted",
                FriendRequest.sender_id == viewer.id,
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
    is_blocked_author = exists(
        select(Block.id).where(
            ((Block.blocker_id == viewer.id) & (Block.blocked_id == Post.user_id))
            | ((Block.blocker_id == Post.user_id) & (Block.blocked_id == viewer.id))
        )
    )

    statement = (
        select(
            Post,
            User,
            Project,
            tick_count,
            comment_count,
            share_count,
            save_count,
            is_followed,
            ticked_by_user,
            saved_by_user,
            shared_by_user,
            has_image,
            has_video,
        )
        .join(User, User.id == Post.user_id)
        .outerjoin(Project, Project.id == Post.project_id)
        .where(
            (Post.moderation_status == "published")
            & (User.account_status == "active")
            & ((Post.user_id == viewer.id) | (~is_private_creator) | is_followed)
            & ~is_blocked_author
        )
    )
    if author:
        statement = statement.where(User.username == author)

    result = await db.execute(statement)
    rows = result.all()

    affinity_weights = await _load_affinity_weights(db, viewer.id)
    viewer_skills = _skill_set(viewer.skills)

    items: dict[int, dict] = {}

    for (
        post,
        creator,
        project,
        ticks,
        comments,
        shares,
        saves,
        followed,
        ticked,
        saved,
        shared,
        image_present,
        video_present,
    ) in rows:
        engagement = calculate_engagement(
            ticks=ticks,
            comments=comments,
            shares=shares,
            saves=saves,
        )
        recency = calculate_recency(
            post.created_at, half_life_hours=36.0, freshness_window_hours=3.0
        )
        interest = calculate_interest_match(
            viewer_skills,
            _skill_set(creator.skills),
            viewer.category,
            creator.category,
            project.category if project else "",
        )
        affinity = calculate_behavioral_affinity(
            affinity_weights.get(creator.id, 0)
        )
        score = calculate_feed_score(
            engagement=engagement,
            recency=recency,
            is_followed=followed,
            is_own_post=post.user_id == viewer.id,
            interest_match=interest,
            affinity=affinity,
        )

        items[post.id] = {
            "id": post.id,
            "feed_id": f"post-{post.id}",
            "user_id": post.user_id,
            "author": creator.display_name or creator.username,
            "username": creator.username,
            "author_category": creator.category or "",
            "content": post.content,
            "image": f"/posts/{post.id}/image" if image_present else None,
            "video": f"/posts/{post.id}/video" if video_present else None,
            "project": _project_preview(project) if project else None,
            "created_at": post.created_at,
            "reposted_by": None,
            "reposted_at": None,
            "engagement": engagement,
            "recency": recency,
            "followed": followed,
            "interest_match": interest,
            "affinity": affinity,
            "tick_count": ticks,
            "ticked": ticked,
            "comment_count": comments,
            "share_count": shares,
            "saved": saved,
            "shared": shared,
            "score": score,
            "_sort_time": post.created_at,
        }

    if not author and items:
        share_rows = await db.execute(
            select(Share, User)
            .join(User, User.id == Share.user_id)
            .where(
                Share.post_id.in_(items.keys()),
                User.account_status == "active",
            )
            .order_by(Share.created_at.desc(), Share.id.desc())
            .limit(_SHARE_LIMIT)
        )
        seen_posts: set[int] = set()
        for share, sharer in share_rows.all():
            if share.post_id in seen_posts:
                continue
            seen_posts.add(share.post_id)

            item = dict(items[share.post_id])
            recency = calculate_recency(
                share.created_at, half_life_hours=36.0, freshness_window_hours=3.0
            )
            item.update(
                {
                    "feed_id": f"share-{share.id}",
                    "reposted_by": _author_preview(sharer),
                    "reposted_at": share.created_at,
                    "recency": recency,
                    "score": calculate_feed_score(
                        engagement=item["engagement"],
                        recency=recency,
                        is_followed=item["followed"],
                        is_own_post=item["user_id"] == viewer.id,
                        interest_match=item["interest_match"],
                        affinity=item["affinity"],
                    ),
                    "_sort_time": share.created_at,
                }
            )
            items[share.post_id] = item

    feed = list(items.values())
    if author:
        feed.sort(
            key=lambda item: (item["_sort_time"], item["id"]), reverse=True
        )
    else:
        feed.sort(
            key=lambda item: (item["score"], item["_sort_time"]), reverse=True
        )

    for item in feed:
        item.pop("_sort_time", None)
    return feed


async def load_feed_page(
    db: AsyncSession,
    viewer: User,
    *,
    limit: int,
    offset: int,
    author: str | None = None,
) -> dict:
    if author:
        items = await _build_feed_items(db, viewer, author=author)
    else:
        cache_key = feed_cache_key(viewer.id)
        cached = await get_feed_cache(cache_key)
        if cached is not None:
            items = cached
        else:
            items = await _build_feed_items(db, viewer)
            await set_feed_cache(cache_key, items)

    total = len(items)
    return {
        "items": items[offset : offset + limit],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
