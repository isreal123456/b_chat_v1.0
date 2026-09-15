
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.friend_request import FriendRequest


router = APIRouter(
    prefix="/friends",
    tags=["Friends"]
)



@router.post("/requests/{user_id}", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot send a friend request to yourself"
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    receiver = result.scalar_one_or_none()

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    result = await db.execute(
        select(FriendRequest).where(
            or_(and_(FriendRequest.sender_id == current_user.id,FriendRequest.receiver_id == user_id),
                and_( FriendRequest.sender_id == user_id, FriendRequest.receiver_id == current_user.id),
            )
        )   
    )
    existing_request = result.scalar_one_or_none()

    if existing_request:

        if existing_request.status == "accepted":
            raise HTTPException(
                status_code=400,
                detail="You are already friends"
            )

        if existing_request.status == "pending":

            if existing_request.sender_id == user_id:
                raise HTTPException(
                    status_code=400,
                    detail="This user has already sent you a friend request"
                )

            raise HTTPException(
                status_code=400,
                detail="Friend request already sent"
            )

        if existing_request.status == "rejected":
            existing_request.sender_id = current_user.id
            existing_request.receiver_id = user_id
            existing_request.status = "pending"

            await db.commit()

            return {
                "message": "Friend request sent"
            }

    friend_request = FriendRequest(
        sender_id=current_user.id,
        receiver_id=user_id,
        status="pending"
    )

    db.add(friend_request)

    await db.commit()
    await db.refresh(friend_request)

    return {
        "message": "Friend request sent",
        "request_id": friend_request.id
    }



@router.get("/requests/received")
async def get_received_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(FriendRequest)
        .where(
            FriendRequest.receiver_id == current_user.id,
            FriendRequest.status == "pending"
        )
    )

    requests = result.scalars().all()

    return requests



@router.get("/requests/sent")
async def get_sent_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(FriendRequest)
        .where(
            FriendRequest.sender_id == current_user.id,
            FriendRequest.status == "pending"
        )
    )

    requests = result.scalars().all()

    return requests



@router.patch("/requests/{request_id}/accept")
async def accept_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(FriendRequest).where(
            FriendRequest.id == request_id
        )
    )

    friend_request = result.scalar_one_or_none()

    if not friend_request:
        raise HTTPException(
            status_code=404,
            detail="Friend request not found"
        )

    # Only receiver can accept
    if friend_request.receiver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot accept this friend request"
        )

    if friend_request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Friend request is no longer pending"
        )

    friend_request.status = "accepted"

    await db.commit()

    return {
        "message": "Friend request accepted"
    }



@router.patch("/requests/{request_id}/reject")
async def reject_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(FriendRequest).where(
            FriendRequest.id == request_id
        )
    )

    friend_request = result.scalar_one_or_none()

    if not friend_request:
        raise HTTPException(
            status_code=404,
            detail="Friend request not found"
        )

    if friend_request.receiver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot reject this friend request"
        )

    if friend_request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Friend request is no longer pending"
        )

    friend_request.status = "rejected"

    await db.commit()

    return {
        "message": "Friend request rejected"
    }



@router.delete("/requests/{request_id}")
async def delete_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(FriendRequest).where(
            FriendRequest.id == request_id
        )
    )

    friend_request = result.scalar_one_or_none()

    if not friend_request:
        raise HTTPException(
            status_code=404,
            detail="Friend request not found"
        )

    # Sender can cancel.
    # Receiver can also delete a received request.
    if (
        friend_request.sender_id != current_user.id
        and friend_request.receiver_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot delete this friend request"
        )

    await db.delete(friend_request)
    await db.commit()

    return {
        "message": "Friend request deleted"
    }


@router.get("")
async def get_my_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(FriendRequest).where(
            FriendRequest.status == "accepted",
            or_(
                FriendRequest.sender_id == current_user.id,
                FriendRequest.receiver_id == current_user.id
            )
        )
    )

    friendships = result.scalars().all()

    friend_ids = []

    for friendship in friendships:

        if friendship.sender_id == current_user.id:
            friend_ids.append(friendship.receiver_id)

        else:
            friend_ids.append(friendship.sender_id)

    if not friend_ids:
        return []

    result = await db.execute(
        select(User).where(User.id.in_(friend_ids))
    )

    friends = result.scalars().all()

    return friends



@router.get("/{user_id}")
async def get_user_friends(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):

    # Check user exists
    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Get accepted friendships
    result = await db.execute(
        select(FriendRequest).where(
            FriendRequest.status == "accepted",
            or_(
                FriendRequest.sender_id == user_id,
                FriendRequest.receiver_id == user_id
            )
        )
    )

    friendships = result.scalars().all()

    friend_ids = []

    for friendship in friendships:

        if friendship.sender_id == user_id:
            friend_ids.append(friendship.receiver_id)

        else:
            friend_ids.append(friendship.sender_id)

    if not friend_ids:
        return []

    result = await db.execute(
        select(User).where(User.id.in_(friend_ids))
    )

    friends = result.scalars().all()

    return friends



@router.delete("/{user_id}")
async def remove_friend(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(FriendRequest).where(
            FriendRequest.status == "accepted",
            or_(
                and_(
                    FriendRequest.sender_id == current_user.id,
                    FriendRequest.receiver_id == user_id
                ),
                and_(
                    FriendRequest.sender_id == user_id,
                    FriendRequest.receiver_id == current_user.id
                )
            )
        )
    )

    friendship = result.scalar_one_or_none()

    if not friendship:
        raise HTTPException(
            status_code=404,
            detail="Friendship not found"
        )

    await db.delete(friendship)

    await db.commit()

    return {
        "message": "Friend removed successfully"
    }

