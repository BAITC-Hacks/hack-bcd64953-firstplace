from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.routes.applications import Limit, Offset
from app.dependencies import BusinessDep, ProfileDep, StudentDep, get_response_service
from app.schemas.common import Page
from app.schemas.response import Decision, Response, ResponseCreate, Team
from app.services.response_service import ResponseService

router = APIRouter(tags=["Responses"])
Service = Annotated[ResponseService, Depends(get_response_service)]


@router.post("/applications/{application_id}/responses", response_model=Response, status_code=201)
def submit(
    application_id: UUID, profile: StudentDep, payload: ResponseCreate, service: Service
) -> Response:
    return service.create(application_id, profile, payload)


@router.get("/student/responses", response_model=Page[Response])
def student_responses(
    profile: StudentDep, service: Service, limit: Limit = 20, offset: Offset = 0
) -> Page[Response]:
    return service.list(profile, None, limit, offset)


@router.get("/business/responses", response_model=Page[Response])
def business_responses(
    profile: BusinessDep,
    service: Service,
    application_id: UUID | None = None,
    limit: Limit = 20,
    offset: Offset = 0,
) -> Page[Response]:
    return service.list(profile, application_id, limit, offset)


@router.get("/applications/{application_id}/responses", response_model=Page[Response])
def application_responses(
    application_id: UUID,
    profile: BusinessDep,
    service: Service,
    limit: Limit = 20,
    offset: Offset = 0,
) -> Page[Response]:
    return service.list(profile, application_id, limit, offset)


@router.get("/responses/{response_id}", response_model=Response)
def get_response(response_id: UUID, profile: ProfileDep, service: Service) -> Response:
    return service.get(response_id, profile)


@router.patch("/responses/{response_id}/decision", response_model=Response)
def decide(
    response_id: UUID, profile: BusinessDep, payload: Decision, service: Service
) -> Response:
    return service.decide(response_id, profile, payload)


@router.get("/business/teams/{team_id}", response_model=Team)
def team(team_id: UUID, profile: BusinessDep, service: Service) -> Team:
    return service.team(team_id, profile)
