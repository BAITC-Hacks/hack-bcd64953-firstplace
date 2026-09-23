from fastapi import APIRouter

from app.api.routes import (
    ai_analysis,
    applications,
    csv_analysis,
    health,
    notifications,
    profiles,
    responses,
)
from app.schemas.common import ErrorResponse

router = APIRouter(
    prefix="/api/v1",
    responses={
        code: {"model": ErrorResponse}
        for code in [401, 403, 404, 409, 413, 422, 500, 502, 503, 504]
    },
)
for module in [health, profiles, applications, ai_analysis, csv_analysis, responses, notifications]:
    router.include_router(module.router)
