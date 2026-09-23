import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.exceptions import APIError

logger = logging.getLogger("ai_sana.errors")


def error_response(request: Request, error: APIError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    headers = {"X-Request-ID": request_id}
    if error.status == 401:
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(
        status_code=error.status,
        headers=headers,
        content={
            "error": {"code": error.code, "message": error.message, "details": error.details},
            "request_id": request_id,
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error(request: Request, exc: APIError) -> JSONResponse:
        return error_response(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Never echo submitted values, tokens, or Pydantic context in error responses.
        details = [
            {"field": ".".join(map(str, item["loc"])), "type": item["type"]}
            for item in exc.errors()
        ]
        return error_response(
            request, APIError(422, "validation_error", "Проверьте поля запроса.", details)
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        return error_response(
            request, APIError(exc.status_code, "http_error", "Запрос не может быть выполнен.")
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        # Exception text from providers may contain credentials or private CSV values.
        logger.error(
            "request_id=%s exception_type=%s", request.state.request_id, type(exc).__name__
        )
        return error_response(request, APIError(500, "internal_error", "Внутренняя ошибка."))
