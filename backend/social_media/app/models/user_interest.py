from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserInterest(Base):
    __tablename__ = "user_interests"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    interest: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "interest",
            name="unique_user_interest"
        ),
    )