from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AdminActivityLog(Base):
    __tablename__ = "admin_activity_logs"
    __table_args__ = (
        Index("ix_admin_activity_action_created", "action", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    admin_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    admin_username: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    admin_role: Mapped[str] = mapped_column(String(20), nullable=False, default="")

    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    target_id: Mapped[int | None] = mapped_column(nullable=True)
    summary: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    details: Mapped[str] = mapped_column(Text, nullable=False, default="{}")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
