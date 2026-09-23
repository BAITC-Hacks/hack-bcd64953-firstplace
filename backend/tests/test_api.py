from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import (
    get_application_service,
    get_csv_service,
    get_current_profile,
    get_notification_service,
    get_response_service,
)
from app.main import create_app


@pytest.fixture
def api():
    return create_app(Settings(_env_file=None, app_env="test"))


def test_public_docs_and_auth(api):
    with TestClient(api) as client:
        for path in ["/docs", "/redoc", "/openapi.json", "/api/v1/health"]:
            assert client.get(path).status_code == 200
        result = client.get("/api/v1/profile")
        assert result.status_code == 401
        assert result.headers["www-authenticate"] == "Bearer"
        assert result.json()["request_id"] == result.headers["x-request-id"]
        paths = client.get("/openapi.json").json()["paths"]
        assert paths["/api/v1/profile"]["get"]["security"] == [{"HTTPBearer": []}]


@pytest.mark.parametrize(
    "role,method,path",
    [
        ("student", "post", "/applications"),
        ("student", "get", "/business/applications"),
        ("student", "get", "/business/responses"),
        ("student", "patch", "/responses/{id}/decision"),
        ("business", "get", "/applications"),
        ("business", "get", "/student/responses"),
        ("business", "post", "/applications/{id}/responses"),
    ],
)
def test_role_guards(api, business, student, role, method, path):
    api.dependency_overrides[get_current_profile] = lambda: (
        student if role == "student" else business
    )
    for dep in [get_application_service, get_response_service, get_csv_service]:
        api.dependency_overrides[dep] = Mock
    with TestClient(api) as client:
        result = client.request(method, "/api/v1" + path.format(id=uuid4()), json={})
        assert result.status_code == 403


def test_validation_has_no_input_echo(api, business):
    api.dependency_overrides[get_current_profile] = lambda: business
    service = Mock()
    api.dependency_overrides[get_application_service] = lambda: service
    with TestClient(api) as client:
        response = client.post("/api/v1/applications", json={"description": "secret"})
    assert response.status_code == 422
    assert "secret" not in response.text
    service.create.assert_not_called()


def test_cors_and_body_limit(api):
    with TestClient(api) as client:
        allowed = client.options(
            "/api/v1/profile",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )
        assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
        denied = client.options(
            "/api/v1/profile",
            headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
        )
        assert "access-control-allow-origin" not in denied.headers
        response = client.post("/api/v1/applications", content=b"x" * (6 * 1024 * 1024))
        assert response.status_code == 413


def test_unknown_error_is_redacted(api, student):
    api.dependency_overrides[get_current_profile] = lambda: student
    service = Mock()
    service.list.side_effect = RuntimeError("SUPER_SECRET_KEY")
    api.dependency_overrides[get_notification_service] = lambda: service
    with TestClient(api, raise_server_exceptions=False) as client:
        response = client.get("/api/v1/notifications")
    assert response.status_code == 500
    assert "SUPER_SECRET" not in response.text
