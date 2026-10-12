from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    likes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    comments: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    follows: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    messages: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    private_account: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_activity: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allow_tagging: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
