from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.block import Block
from app.models.user import User
from app.services.feed_cache import invalidate_feed_cache

router = APIRouter(prefix="/blocks", tags=["blocks"])


async def is_blocked_between(db: AsyncSession, first_id: int, second_id: int) -> bool:
    """True when either user has blocked the other."""

    block = await db.scalar(
        select(Block.id).where(
            ((Block.blocker_id == first_id) & (Block.blocked_id == second_id))
            | ((Block.blocker_id == second_id) & (Block.blocked_id == first_id))
        )
    )
    return block is not None


@router.post("/{user_id}", status_code=status.HTTP_201_CREATED)
async def block_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")

    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.scalar(
        select(Block.id).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == user_id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="User is already blocked")

    db.add(Block(blocker_id=current_user.id, blocked_id=user_id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="User is already blocked")

    await invalidate_feed_cache(current_user.id)
    await invalidate_feed_cache(user_id)
    return {"message": "User blocked successfully", "blocked_user_id": user_id}


@router.delete("/{user_id}")
async def unblock_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await db.scalar(
        select(Block).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == user_id,
        )
    )
    if block is None:
        raise HTTPException(status_code=404, detail="User is not blocked")

    await db.delete(block)
    await db.commit()
    await invalidate_feed_cache(current_user.id)
    await invalidate_feed_cache(user_id)
    return {"message": "User unblocked successfully", "blocked_user_id": user_id}


@router.get("")
async def list_blocked_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .join(Block, Block.blocked_id == User.id)
        .where(Block.blocker_id == current_user.id)
        .order_by(User.username)
    )
    return {
        "blocked_users": [
            {
                "id": user.id,
                "username": user.username,
                "name": user.display_name or user.username,
                "avatar_url": f"/users/{user.id}/avatar",
            }
            for user in result.scalars().all()
        ]
    }


@router.get("/status/{user_id}")
async def get_block_status(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await db.scalar(
        select(Block.id).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == user_id,
        )
    )
    return {"user_id": user_id, "blocked": block is not None}
