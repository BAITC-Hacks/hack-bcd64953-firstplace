from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import InputModel


class Notification(BaseModel):
    id: UUID
    profile_id: UUID
    title: str
    body: str
    link: str
    is_read: bool
    created_at: datetime


class NotificationUpdate(InputModel):
    is_read: bool = True
