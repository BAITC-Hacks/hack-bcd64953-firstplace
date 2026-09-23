from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import BusinessDep, get_ai_service
from app.schemas.analysis import Answers, ApplicationAnalysis
from app.schemas.application import Application
from app.services.ai_service import AIService

router = APIRouter(tags=["AI analysis"])
Service = Annotated[AIService, Depends(get_ai_service)]


@router.post("/applications/{application_id}/analyze", response_model=ApplicationAnalysis)
def analyze(application_id: UUID, profile: BusinessDep, service: Service) -> ApplicationAnalysis:
    return service.analyze(application_id, profile)


@router.get("/applications/{application_id}/analysis", response_model=ApplicationAnalysis)
def latest(application_id: UUID, profile: BusinessDep, service: Service) -> ApplicationAnalysis:
    return service.latest(application_id, profile)


@router.post("/applications/{application_id}/answers", response_model=Application)
def answers(
    application_id: UUID, profile: BusinessDep, payload: Answers, service: Service
) -> Application:
    return service.answer(application_id, profile, payload)
