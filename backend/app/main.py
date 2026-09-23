from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.config import Settings, get_settings
from app.middleware.body_limit import BodyLimitMiddleware
from app.middleware.error_handler import register_error_handlers
from app.middleware.request_id import RequestIDMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()
    application = FastAPI(
        title="AI Sana Challenge Hub API",
        version="1.0.0",
        description="Supabase Auth Bearer JWT. Business and student workflows. "
        "UUID identifiers, UTC timestamps, snake_case JSON.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    if settings is not None:
        application.dependency_overrides[get_settings] = lambda: config
    register_error_handlers(application)
    application.include_router(router)
    application.add_middleware(
        BodyLimitMiddleware, max_bytes=config.max_csv_size_mb * 1024 * 1024 + 65536
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[config.frontend_url, *config.extra_cors_origins],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(RequestIDMiddleware)
    return application


app = create_app()
