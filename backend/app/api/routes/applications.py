from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Query

from app.dependencies import ApplicationServiceDep, BusinessDep, ProfileDep, StudentDep
from app.schemas.application import (
    Application,
    ApplicationCreate,
    ApplicationStatus,
    ApplicationUpdate,
)
from app.schemas.common import Page

router = APIRouter(tags=["Applications"])
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]


@router.get("/applications", response_model=Page[Application])
def catalog(
    profile: StudentDep,
    service: ApplicationServiceDep,
    limit: Limit = 20,
    offset: Offset = 0,
    search: Annotated[str, Query(max_length=200)] = "",
    skill: Annotated[str, Query(max_length=80)] = "",
    sort: Literal["newest", "oldest"] = "newest",
) -> Page[Application]:
    return service.list(
        owner_id=None,
        status="published",
        search=search,
        skill=skill,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@router.get("/business/applications", response_model=Page[Application])
def own_applications(
    profile: BusinessDep,
    service: ApplicationServiceDep,
    limit: Limit = 20,
    offset: Offset = 0,
    status: ApplicationStatus | None = None,
    search: Annotated[str, Query(max_length=200)] = "",
) -> Page[Application]:
    return service.list(
        owner_id=str(profile.id),
        status=status,
        search=search,
        skill="",
        sort="newest",
        limit=limit,
        offset=offset,
    )


@router.post("/applications", response_model=Application, status_code=201)
def create_application(
    profile: BusinessDep, payload: ApplicationCreate, service: ApplicationServiceDep
) -> Application:
    return service.create(profile, payload)


@router.get("/applications/{application_id}", response_model=Application)
def get_application(
    application_id: UUID, profile: ProfileDep, service: ApplicationServiceDep
) -> Application:
    return service.get(application_id, profile)


@router.put("/applications/{application_id}", response_model=Application)
@router.patch("/applications/{application_id}", response_model=Application)
def update_application(
    application_id: UUID,
    profile: BusinessDep,
    payload: ApplicationUpdate,
    service: ApplicationServiceDep,
) -> Application:
    return service.update(application_id, profile, payload)


@router.post("/applications/{application_id}/publish", response_model=Application)
def publish(
    application_id: UUID, profile: BusinessDep, service: ApplicationServiceDep
) -> Application:
    return service.set_status(application_id, profile, "published")


@router.post("/applications/{application_id}/close", response_model=Application)
def close(
    application_id: UUID, profile: BusinessDep, service: ApplicationServiceDep
) -> Application:
    return service.set_status(application_id, profile, "closed")
