from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Conversation(Base):
	__tablename__ = "conversations"

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime,
		default=datetime.utcnow,
		nullable=False,
	)
