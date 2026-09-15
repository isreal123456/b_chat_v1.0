from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_id: int
    sender_id: int
    type: str
    message: str
    post_id: int | None = None
    is_read: bool = False
    created_at: datetime
