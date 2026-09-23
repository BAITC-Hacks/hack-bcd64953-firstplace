from uuid import UUID

from app.repositories.notifications import NotificationsRepository
from app.schemas.common import Page
from app.schemas.notification import Notification
from app.schemas.profile import Profile


class NotificationService:
    def __init__(self, repository: NotificationsRepository) -> None:
        self.repository = repository

    def list(
        self, profile: Profile, unread_only: bool, limit: int, offset: int
    ) -> Page[Notification]:
        rows, count = self.repository.list(str(profile.id), unread_only, limit, offset)
        return Page[Notification](
            items=[Notification.model_validate(row) for row in rows],
            total=count,
            limit=limit,
            offset=offset,
        )

    def mark(self, row_id: UUID, profile: Profile, is_read: bool) -> Notification:
        return Notification.model_validate(
            self.repository.mark(str(row_id), str(profile.id), is_read)
        )
