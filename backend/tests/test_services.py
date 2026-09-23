from unittest.mock import Mock
from uuid import uuid4

import httpx
import pytest

from app.config import Settings
from app.exceptions import APIError
from app.schemas.application import ApplicationUpdate
from app.schemas.profile import CurrentUser, ProfileUpdate
from app.schemas.response import ResponseCreate
from app.services.ai_service import AIService
from app.services.application_service import ApplicationService
from app.services.csv_service import CSVService
from app.services.profile_service import ProfileService
from app.services.response_service import ResponseService


def test_owner_and_draft_enforcement(business, student, application):
    repo = Mock()
    repo.get.return_value = application.model_dump(mode="json")
    service = ApplicationService(repo)
    with pytest.raises(APIError) as exc:
        service.get(application.id, student, owner=True)
    assert exc.value.status == 404
    with pytest.raises(APIError) as exc:
        service.update(application.id, business, ApplicationUpdate(title="Changed"))
    assert exc.value.status == 409
    repo.mutate.assert_not_called()
    application.status = "draft"
    repo.get.return_value = application.model_dump(mode="json")
    with pytest.raises(APIError) as exc:
        service.get(application.id, student)
    assert exc.value.status == 404


def test_incomplete_cannot_publish(business, application):
    application.status = "draft"
    application.timeline = ""
    repo = Mock()
    repo.get.return_value = application.model_dump(mode="json")
    with pytest.raises(APIError) as exc:
        ApplicationService(repo).set_status(application.id, business, "published")
    assert exc.value.status == 409
    repo.mutate.assert_not_called()


def test_profile_role_is_immutable(student):
    repo = Mock()
    repo.by_user.return_value = student.model_dump(mode="json")
    with pytest.raises(APIError) as exc:
        ProfileService(repo).save(
            CurrentUser(id=student.user_id),
            ProfileUpdate(role="business", display_name="Escalation"),
        )
    assert exc.value.status == 409
    repo.save.assert_not_called()


def test_upload_cleanup_on_database_failure(student, application, csv_bytes):
    repository, storage, applications = Mock(), Mock(), Mock()
    applications.published.return_value = application
    repository.insert.side_effect = APIError(503, "database_unavailable", "Unavailable")
    service = CSVService(Settings(_env_file=None), applications, repository, storage)
    with pytest.raises(APIError):
        service.upload(application.id, student, "../../team.csv", csv_bytes)
    path = storage.upload.call_args.args[0]
    assert ".." not in path
    storage.remove.assert_called_once_with(path)


@pytest.mark.parametrize("score,revision,status", [(89, 2, 422), (100, 1, 409)])
def test_submission_requires_current_matching(student, application, score, revision, status):
    repository, applications = Mock(), Mock()
    applications.published.return_value = application
    upload_id = uuid4()
    repository.get.return_value = {
        "id": upload_id,
        "application_id": application.id,
        "student_id": student.id,
        "filename": "team.csv",
        "members": [],
        "created_at": application.created_at,
    }
    repository.latest_evaluation.return_value = {"score": score, "application_revision": revision}
    service = ResponseService(Settings(_env_file=None), repository, Mock(), applications)
    with pytest.raises(APIError) as exc:
        service.create(application.id, student, ResponseCreate(upload_id=upload_id))
    assert exc.value.status == status
    repository.rpc.assert_not_called()


def test_foreign_csv_cannot_be_read_or_submitted(student, application):
    repository, applications = Mock(), Mock()
    applications.published.return_value = application
    upload_id = uuid4()
    repository.get.return_value = {
        "id": upload_id,
        "application_id": application.id,
        "student_id": uuid4(),
        "filename": "private.csv",
        "members": [],
        "created_at": application.created_at,
    }
    csv_service = CSVService(Settings(_env_file=None), applications, repository, Mock())
    with pytest.raises(APIError) as exc:
        csv_service.get(application.id, upload_id, student)
    assert exc.value.status == 404
    response_service = ResponseService(Settings(_env_file=None), repository, Mock(), applications)
    with pytest.raises(APIError) as exc:
        response_service.create(application.id, student, ResponseCreate(upload_id=upload_id))
    assert exc.value.status == 404


@pytest.mark.parametrize("mode,status", [("timeout", 504), ("invalid", 502), ("valid", 200)])
def test_ai_provider_validation(application, monkeypatch, mode, status):
    real_client = httpx.Client

    def handler(request):
        if mode == "timeout":
            raise httpx.ReadTimeout("sensitive-provider-error")
        content = (
            '{"summary":"Summary","questions":[],"recommendations":[]}'
            if mode == "valid"
            else '{"score": 100}'
        )
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    monkeypatch.setattr(
        "app.services.ai_service.httpx.Client",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler)),
    )
    service = AIService(
        Settings(
            _env_file=None,
            ai_api_key="secret",
            ai_model="test",
            ai_base_url="https://ai.example/v1",
        ),
        Mock(),
    )
    if status == 200:
        assert service.suggestions(application).summary == "Summary"
    else:
        with pytest.raises(APIError) as exc:
            service.suggestions(application)
        assert exc.value.status == status
        assert "sensitive" not in exc.value.message
