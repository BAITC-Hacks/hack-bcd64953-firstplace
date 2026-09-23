from typing import Any
from uuid import UUID

from app.exceptions import conflict, not_found
from app.repositories.applications import ApplicationsRepository
from app.schemas.application import Application, ApplicationCreate, ApplicationUpdate
from app.schemas.common import Page
from app.schemas.profile import Profile
from app.services.readiness_service import calculate_readiness


class ApplicationService:
    def __init__(self, repository: ApplicationsRepository) -> None:
        self.repository = repository

    def get(self, app_id: UUID, profile: Profile, *, owner: bool = False) -> Application:
        app = Application.model_validate(self.repository.get("applications", str(app_id)))
        if owner:
            if profile.role != "business" or app.business_id != profile.id:
                raise not_found()
        elif app.status != "published" and app.business_id != profile.id:
            raise not_found()
        return app

    def published(self, app_id: UUID, profile: Profile) -> Application:
        app = self.get(app_id, profile)
        if app.status != "published":
            raise conflict("Заявка больше не принимает отклики.")
        return app

    def create(self, profile: Profile, payload: ApplicationCreate) -> Application:
        data = payload.model_dump(mode="json")
        data.update(
            business_id=str(profile.id),
            organization_name=profile.business.organization_name if profile.business else "",
            readiness_score=calculate_readiness(data).score,
        )
        return Application.model_validate(self.repository.insert("applications", data))

    def update(self, app_id: UUID, profile: Profile, payload: ApplicationUpdate) -> Application:
        app = self.get(app_id, profile, owner=True)
        if app.status != "draft":
            raise conflict("Редактировать можно только черновик.")
        changes = payload.model_dump(mode="json", exclude_unset=True)
        changes["readiness_score"] = calculate_readiness(
            app.model_dump(mode="json") | changes
        ).score
        return Application.model_validate(
            self.repository.mutate(
                str(app.id),
                str(profile.id),
                app.revision,
                changes,
            )
        )

    def set_status(self, app_id: UUID, profile: Profile, status: str) -> Application:
        app = self.get(app_id, profile, owner=True)
        if app.status == status:
            return app
        if status == "published":
            if app.status != "draft" or calculate_readiness(app.model_dump()).score < 100:
                raise conflict("Для публикации заполните все обязательные поля заявки.")
        elif app.status != "published":
            raise conflict("Закрыть можно только опубликованную заявку.")
        return Application.model_validate(
            self.repository.mutate(
                str(app.id),
                str(profile.id),
                app.revision,
                {"status": status},
            )
        )

    def list(self, **kwargs: Any) -> Page[Application]:
        rows, count = self.repository.list(**kwargs)
        return Page[Application](
            items=[Application.model_validate(row) for row in rows],
            total=count,
            limit=kwargs["limit"],
            offset=kwargs["offset"],
        )
