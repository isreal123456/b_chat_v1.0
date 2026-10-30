"""Discovery: trending updates, trending skills, and recommended people.

Everything here is derived from data TickMe already stores — posts, ticks,
comments, shares, follows, connections, and profile skills — so suggestions
stay explainable instead of random.
"""

import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.block import Block
from app.models.follow import Follow
from app.models.friend_request import FriendRequest
from app.models.user import User
from app.services.follow_service import get_followed_ids
from app.services.feed_service import _build_feed_items
from app.services.user_service import parse_skills, serialize_public_user

router = APIRouter(prefix="/discovery", tags=["discovery"])

_SCAN_LIMIT = 60


def _skill_names(raw: str | None) -> list[str]:
    seen: set[str] = set()
    names: list[str] = []
    for skill in parse_skills(raw):
        label = skill.strip()
        if label and label.lower() not in seen:
            seen.add(label.lower())
            names.append(label)
    return names


async def _connected_ids(db: AsyncSession, viewer_id: int) -> set[int]:
    rows = await db.execute(
        select(FriendRequest.sender_id, FriendRequest.receiver_id).where(
            FriendRequest.status == "accepted",
            or_(
                FriendRequest.sender_id == viewer_id,
                FriendRequest.receiver_id == viewer_id,
            ),
        )
    )
    connected: set[int] = set()
    for sender_id, receiver_id in rows.all():
        connected.add(receiver_id if sender_id == viewer_id else sender_id)
    return connected


async def _pending_ids(db: AsyncSession, viewer_id: int) -> set[int]:
    rows = await db.execute(
        select(FriendRequest.sender_id, FriendRequest.receiver_id).where(
            FriendRequest.status == "pending",
            or_(
                FriendRequest.sender_id == viewer_id,
                FriendRequest.receiver_id == viewer_id,
            ),
        )
    )
    pending: set[int] = set()
    for sender_id, receiver_id in rows.all():
        pending.add(receiver_id if sender_id == viewer_id else sender_id)
    return pending


async def _hidden_ids(db: AsyncSession, viewer_id: int) -> set[int]:
    rows = await db.execute(
        select(Block.blocker_id, Block.blocked_id).where(
            or_(Block.blocker_id == viewer_id, Block.blocked_id == viewer_id)
        )
    )
    hidden: set[int] = set()
    for blocker_id, blocked_id in rows.all():
        hidden.add(blocked_id if blocker_id == viewer_id else blocker_id)
    return hidden


async def _mutual_connection_counts(
    db: AsyncSession,
    viewer_connections: set[int],
    candidate_ids: set[int],
) -> dict[int, int]:
    if not viewer_connections or not candidate_ids:
        return {}

    rows = await db.execute(
        select(FriendRequest.sender_id, FriendRequest.receiver_id).where(
            FriendRequest.status == "accepted"
        )
    )
    mutual: dict[int, int] = {}
    for sender_id, receiver_id in rows.all():
        if sender_id in viewer_connections and receiver_id in candidate_ids:
            mutual[receiver_id] = mutual.get(receiver_id, 0) + 1
        elif receiver_id in viewer_connections and sender_id in candidate_ids:
            mutual[sender_id] = mutual.get(sender_id, 0) + 1
    return mutual


async def _follower_counts(db: AsyncSession, user_ids: list[int]) -> dict[int, int]:
    if not user_ids:
        return {}
    rows = await db.execute(
        select(Follow.following_id, func.count(Follow.id))
        .where(Follow.following_id.in_(user_ids))
        .group_by(Follow.following_id)
    )
    return {user_id: int(count) for user_id, count in rows.all()}


@router.get("/suggested-people")
async def suggested_people(
    limit: int = Query(default=6, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connected = await _connected_ids(db, current_user.id)
    pending = await _pending_ids(db, current_user.id)
    hidden = await _hidden_ids(db, current_user.id)
    excluded = connected | pending | hidden | {current_user.id}

    candidates = list(
        (
            await db.execute(
                select(User)
                .where(
                    User.id.not_in(excluded),
                    User.account_status == "active",
                )
                .order_by(User.created_at.desc(), User.id.desc())
                .limit(_SCAN_LIMIT)
            )
        )
        .scalars()
        .all()
    )
    if not candidates:
        return {"items": [], "total": 0}

    candidate_ids = {user.id for user in candidates}
    mutual = await _mutual_connection_counts(db, connected, candidate_ids)
    follower_counts = await _follower_counts(db, list(candidate_ids))
    followed = await get_followed_ids(db, current_user.id, list(candidate_ids))

    viewer_skills = {skill.lower() for skill in _skill_names(current_user.skills)}
    viewer_category = (current_user.category or "").lower()

    ranked: list[tuple[float, User, list[str], int, int]] = []
    for user in candidates:
        shared = [
            skill
            for skill in _skill_names(user.skills)
            if skill.lower() in viewer_skills
        ]
        mutual_count = mutual.get(user.id, 0)
        followers = follower_counts.get(user.id, 0)
        category_match = bool(
            viewer_category and viewer_category == (user.category or "").lower()
        )

        score = (
            len(shared) * 1.6
            + mutual_count * 2.2
            + (1.0 if category_match else 0.0)
            + (0.35 if user.available_for_work else 0.0)
            + min(math.log1p(followers) * 0.25, 1.2)
            + (0.15 if user.onboarded else 0.0)
        )
        ranked.append((score, user, shared, mutual_count, followers))

    ranked.sort(key=lambda entry: (-entry[0], entry[1].username))

    items = [
        {
            **serialize_public_user(user, is_following=user.id in followed),
            "mutual_connections": mutual_count,
            "shared_skills": shared,
            "follower_count": followers,
        }
        for _score, user, shared, mutual_count, followers in ranked[:limit]
    ]
    return {"items": items, "total": len(ranked)}


@router.get("/trending")
async def trending_updates(
    days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Posts store naive UTC timestamps, so compare against a naive cutoff.
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    items = await _build_feed_items(db, current_user)
    recent = [item for item in items if item["created_at"] >= cutoff]
    recent.sort(
        key=lambda item: (item["engagement"], item["created_at"]), reverse=True
    )
    return {
        "items": recent[:limit],
        "window_days": days,
        "total": len(recent),
    }


@router.get("/trending-skills")
async def trending_skills(
    limit: int = Query(default=8, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(User.skills).where(
            User.skills != "[]",
            User.account_status == "active",
        )
    )
    counts: dict[str, int] = {}
    display: dict[str, str] = {}

    for (raw,) in rows.all():
        for skill in _skill_names(raw):
            key = skill.lower()
            counts[key] = counts.get(key, 0) + 1
            display.setdefault(key, skill)

    ordered = sorted(counts.items(), key=lambda entry: (-entry[1], entry[0]))
    return {
        "items": [
            {"name": display[key], "count": count}
            for key, count in ordered[:limit]
        ],
        "total": len(ordered),
    }
