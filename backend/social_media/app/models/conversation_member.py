from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConversationMember(Base):
	__tablename__ = "conversation_members"

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	conversation_id: Mapped[int] = mapped_column(
		ForeignKey("conversations.id", ondelete="CASCADE"),
		nullable=False,
		index=True,
	)
	user_id: Mapped[int] = mapped_column(
		ForeignKey("users.id", ondelete="CASCADE"),
		nullable=False,
		index=True,
	)

	__table_args__ = (
		UniqueConstraint(
			"conversation_id",
			"user_id",
			name="unique_conversation_member",
		),
	)
