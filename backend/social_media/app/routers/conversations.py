from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.friend_request import FriendRequest
from app.models.message import Message
from app.models.user import User

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("")
async def get_conversations(
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	friendship_result = await db.execute(
		select(FriendRequest).where(
			FriendRequest.status == "accepted",
			or_(
				FriendRequest.sender_id == current_user.id,
				FriendRequest.receiver_id == current_user.id,
			),
		)
	)

	friend_ids = {
		request.receiver_id if request.sender_id == current_user.id else request.sender_id
		for request in friendship_result.scalars().all()
	}

	message_participant_result = await db.execute(
		select(Message.sender_id, Message.receiver_id).where(
			or_(
				Message.sender_id == current_user.id,
				Message.receiver_id == current_user.id,
			)
		)
	)
	for sender_id, receiver_id in message_participant_result.all():
		friend_ids.add(receiver_id if sender_id == current_user.id else sender_id)

	if not friend_ids:
		return []

	users_result = await db.execute(select(User).where(User.id.in_(friend_ids)))
	users = {user.id: user for user in users_result.scalars().all()}
	conversations = []

	for friend_id, user in users.items():
		message_result = await db.execute(
			select(Message)
			.where(
				or_(
					(Message.sender_id == current_user.id) & (Message.receiver_id == friend_id),
					(Message.sender_id == friend_id) & (Message.receiver_id == current_user.id),
				)
			)
			.order_by(Message.created_at.desc())
			.limit(1)
		)
		latest = message_result.scalar_one_or_none()
		conversations.append({
			"id": user.id,
			"name": user.username,
			"username": user.username,
			"lastMessage": latest.content if latest else "Start a conversation",
			"time": latest.created_at.isoformat() if latest else None,
			"unread": 0,
			"online": False,
		})

	return conversations

