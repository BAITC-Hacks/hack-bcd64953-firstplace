from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.routes.applications import Limit, Offset
from app.dependencies import ProfileDep, get_notification_service
from app.schemas.common import Page
from app.schemas.notification import Notification, NotificationUpdate
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Notifications"])
Service = Annotated[NotificationService, Depends(get_notification_service)]


@router.get("/notifications", response_model=Page[Notification])
def notifications(
    profile: ProfileDep,
    service: Service,
    unread_only: bool = False,
    limit: Limit = 20,
    offset: Offset = 0,
) -> Page[Notification]:
    return service.list(profile, unread_only, limit, offset)


@router.patch("/notifications/{notification_id}", response_model=Notification)
def mark(
    notification_id: UUID, profile: ProfileDep, payload: NotificationUpdate, service: Service
) -> Notification:
    return service.mark(notification_id, profile, payload.is_read)
