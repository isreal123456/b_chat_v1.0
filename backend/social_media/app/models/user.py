from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="user", index=True
    )
    account_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    suspension_reason: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    display_name: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    bio: Mapped[str] = mapped_column(String(160), nullable=False, default="")

    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    terms_version: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    privacy_version: Mapped[str] = mapped_column(String(20), nullable=False, default="")

    headline: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    github_url: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    portfolio_url: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    linkedin_url: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    location: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    available_for_work: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    onboarded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
