from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from starlette.concurrency import run_in_threadpool

from app.dependencies import StudentDep, get_csv_service
from app.exceptions import APIError
from app.schemas.analysis import CSVUpload, MatchResult
from app.services.csv_service import CSVService

router = APIRouter(tags=["CSV and matching"])
Service = Annotated[CSVService, Depends(get_csv_service)]


@router.post("/applications/{application_id}/csv", response_model=CSVUpload, status_code=201)
async def upload(
    application_id: UUID,
    profile: StudentDep,
    service: Service,
    file: Annotated[UploadFile, File(description="UTF-8 team CSV, maximum 5 MiB")],
) -> CSVUpload:
    try:
        max_bytes = service.settings.max_csv_size_mb * 1024 * 1024
        data = await file.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise APIError(413, "csv_too_large", "CSV превышает допустимый размер.")
        return await run_in_threadpool(
            service.upload, application_id, profile, file.filename or "", data
        )
    finally:
        await file.close()


@router.get("/applications/{application_id}/csv/{upload_id}", response_model=CSVUpload)
def get_upload(
    application_id: UUID, upload_id: UUID, profile: StudentDep, service: Service
) -> CSVUpload:
    return service.get(application_id, upload_id, profile)


@router.post("/applications/{application_id}/csv/{upload_id}/analyze", response_model=MatchResult)
def analyze(
    application_id: UUID, upload_id: UUID, profile: StudentDep, service: Service
) -> MatchResult:
    return service.analyze(application_id, upload_id, profile)


@router.get("/applications/{application_id}/csv/{upload_id}/analysis", response_model=MatchResult)
def result(
    application_id: UUID, upload_id: UUID, profile: StudentDep, service: Service
) -> MatchResult:
    return service.result(application_id, upload_id, profile)
