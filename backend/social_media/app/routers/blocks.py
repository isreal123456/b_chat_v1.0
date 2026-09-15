from fastapi import APIRouter
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database.database import get_db
from app.models.block import Block
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/blocks", tags=["blocks"])
@router.post("/block", status_code=status.HTTP_201_CREATED)
async def block_user(
     blocked_user_id: int,
    current_user: User = Depends(get_current_user),
   
    db: AsyncSession = Depends(get_db)
):
    # Check if the user is already blocked
    result = await db.execute(
        select(Block).where(Block.blocked_id == blocked_user_id, Block.blocker_id == current_user.id)
    )
    existing_block = result.scalar_one_or_none()

    if existing_block:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already blocked"
        )

    # Create a new block entry
    block = Block(blocked_id=blocked_user_id, blocker_id=current_user.id)
    db.add(block)
    await db.commit()
    await db.refresh(block)

    return {
        "message": "User blocked successfully",
        "block_id": block.id
    }

@router.delete("/unblock/{blocked_user_id}", status_code=status.HTTP_200_OK)
async def unblock_user(
    blocked_user_id: int,
    db: AsyncSession = Depends(get_db)
):
    
    result = await db.execute(
        select(Block).where(Block.blocked_id == blocked_user_id)
    )
    existing_block = result.scalar_one_or_none()

    if not existing_block:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not blocked"
        )

    
    await db.delete(existing_block)
    await db.commit()

    return {
        "message": "User unblocked successfully"
    }

@router.get("/blocked-users", status_code=status.HTTP_200_OK)
async def get_blocked_users(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Block))
    blocked_users = result.scalars().all()

    return {
        "blocked_users": [block.user_id for block in blocked_users]
    }

@router.get("/users/blocked", status_code=status.HTTP_200_OK)
async def get_user_blocked(
    
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Block).where(Block.blocker_id == current_user.id)
    )
    existing_block = result.all()

    return {
        "is_blocked": existing_block is not None
    }