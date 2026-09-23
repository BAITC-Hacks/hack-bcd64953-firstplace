from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.exceptions import APIError
from app.middleware.authentication import TokenVerifier
from app.repositories.applications import ApplicationsRepository
from app.repositories.notifications import NotificationsRepository
from app.repositories.profiles import ProfilesRepository
from app.repositories.responses import ResponsesRepository
from app.schemas.profile import CurrentUser, Profile
from app.services.ai_service import AIService
from app.services.application_service import ApplicationService
from app.services.csv_service import CSVService
from app.services.notification_service import NotificationService
from app.services.profile_service import ProfileService
from app.services.response_service import ResponseService
from app.services.storage_service import StorageService
from app.services.supabase_service import create_supabase
from supabase import Client

bearer = HTTPBearer(auto_error=False)
SettingsDep = Annotated[Settings, Depends(get_settings)]


@lru_cache
def get_verifier() -> TokenVerifier:
    return TokenVerifier(get_settings())


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    verifier: Annotated[TokenVerifier, Depends(get_verifier)],
) -> CurrentUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise APIError(401, "authentication_required", "Требуется Bearer-токен.")
    return verifier.verify(credentials.credentials)


UserDep = Annotated[CurrentUser, Depends(get_current_user)]


def get_supabase(settings: SettingsDep) -> Iterator[Client]:
    # Request-scoped client: never share or change Auth sessions across requests.
    client = create_supabase(settings)
    try:
        yield client
    finally:
        client.postgrest.session.close()
        client.storage.session.close()
        client.auth.close()


ClientDep = Annotated[Client, Depends(get_supabase)]


def get_profile_service(client: ClientDep) -> ProfileService:
    return ProfileService(ProfilesRepository(client))


def get_current_profile(
    user: UserDep, service: Annotated[ProfileService, Depends(get_profile_service)]
) -> Profile:
    return service.current(user)


ProfileDep = Annotated[Profile, Depends(get_current_profile)]


def require_business(profile: ProfileDep) -> Profile:
    if profile.role != "business":
        raise APIError(403, "business_required", "Действие доступно только бизнесу.")
    return profile


def require_student(profile: ProfileDep) -> Profile:
    if profile.role != "student":
        raise APIError(403, "student_required", "Действие доступно только студентам.")
    return profile


BusinessDep = Annotated[Profile, Depends(require_business)]
StudentDep = Annotated[Profile, Depends(require_student)]


def get_application_service(client: ClientDep) -> ApplicationService:
    return ApplicationService(ApplicationsRepository(client))


ApplicationServiceDep = Annotated[ApplicationService, Depends(get_application_service)]


def get_ai_service(settings: SettingsDep, applications: ApplicationServiceDep) -> AIService:
    return AIService(settings, applications)


def get_csv_service(
    settings: SettingsDep, client: ClientDep, applications: ApplicationServiceDep
) -> CSVService:
    return CSVService(
        settings, applications, ResponsesRepository(client), StorageService(client, settings)
    )


def get_response_service(
    settings: SettingsDep, client: ClientDep, applications: ApplicationServiceDep
) -> ResponseService:
    return ResponseService(
        settings, ResponsesRepository(client), ProfilesRepository(client), applications
    )


def get_notification_service(client: ClientDep) -> NotificationService:
    return NotificationService(NotificationsRepository(client))
