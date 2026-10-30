from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.block import Block
from app.models.friend_request import FriendRequest
from app.models.message import Message
from app.models.user import User
from app.routers.messages import manager as presence_manager

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

	blocked_result = await db.execute(
		select(Block.blocker_id, Block.blocked_id).where(
			or_(
				Block.blocker_id == current_user.id,
				Block.blocked_id == current_user.id,
			)
		)
	)
	for blocker_id, blocked_id in blocked_result.all():
		friend_ids.discard(blocked_id if blocker_id == current_user.id else blocker_id)

	if not friend_ids:
		return []

	users_result = await db.execute(
		select(User).where(
			User.id.in_(friend_ids),
			User.account_status == "active",
		)
	)
	users = {user.id: user for user in users_result.scalars().all()}

	# Pull the user's messages once (newest first) and keep the latest per peer.
	messages_result = await db.execute(
		select(Message)
		.where(
			or_(
				Message.sender_id == current_user.id,
				Message.receiver_id == current_user.id,
			)
		)
		.order_by(Message.created_at.desc(), Message.id.desc())
	)
	latest_by_peer: dict[int, Message] = {}
	for message in messages_result.scalars().all():
		peer_id = message.receiver_id if message.sender_id == current_user.id else message.sender_id
		if peer_id in users and peer_id not in latest_by_peer:
			latest_by_peer[peer_id] = message

	unread_result = await db.execute(
		select(Message.sender_id, func.count(Message.id))
		.where(Message.receiver_id == current_user.id, Message.is_read.is_(False))
		.group_by(Message.sender_id)
	)
	unread_by_sender = {sender_id: int(count) for sender_id, count in unread_result.all()}

	conversations = []
	for friend_id, friend in users.items():
		latest = latest_by_peer.get(friend_id)
		conversations.append({
			"id": friend.id,
			"name": friend.display_name or friend.username,
			"username": friend.username,
			"avatar_url": f"/users/{friend.id}/avatar",
			"lastMessage": latest.content if latest else "Start a conversation",
			"time": latest.created_at.isoformat() if latest and latest.created_at else None,
			"unread": unread_by_sender.get(friend.id, 0),
			"online": presence_manager.is_online(friend.id),
		})

	conversations.sort(key=lambda conversation: conversation["time"] or "", reverse=True)
	return conversations

