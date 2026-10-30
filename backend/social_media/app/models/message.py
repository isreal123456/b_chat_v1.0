from sqlalchemy import String, ForeignKey, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.database import Base


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_receiver_unread", "receiver_id", "is_read"),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    receiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    content: Mapped[str] = mapped_column(
        String(),
        nullable=False
    )

    is_read: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )

    created_at: Mapped[str] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )