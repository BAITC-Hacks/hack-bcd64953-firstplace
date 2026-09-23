import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

import httpx
from pydantic import ValidationError

from app.config import Settings
from app.exceptions import APIError, conflict, not_found
from app.schemas.analysis import AISuggestions, Answers, ApplicationAnalysis, Question
from app.schemas.application import Application, ApplicationUpdate
from app.schemas.profile import Profile
from app.services.application_service import ApplicationService
from app.services.readiness_service import calculate_readiness


class AIService:
    def __init__(self, settings: Settings, applications: ApplicationService) -> None:
        self.settings = settings
        self.applications = applications

    def suggestions(self, app: Application) -> AISuggestions:
        if not (
            self.settings.ai_api_key.get_secret_value()
            and self.settings.ai_model
            and self.settings.ai_base_url
        ):
            raise APIError(503, "ai_not_configured", "Сервис ИИ ещё не настроен.")
        prompt = Path(__file__).resolve().parents[1] / "prompts/application_analysis.txt"
        try:
            with httpx.Client(
                timeout=httpx.Timeout(45, connect=5), follow_redirects=False
            ) as client:
                response = client.post(
                    self.settings.ai_base_url.rstrip("/") + "/chat/completions",
                    headers={
                        "Authorization": "Bearer " + self.settings.ai_api_key.get_secret_value()
                    },
                    json={
                        "model": self.settings.ai_model,
                        "messages": [
                            {"role": "system", "content": prompt.read_text(encoding="utf-8")},
                            {
                                "role": "user",
                                "content": json.dumps(
                                    {
                                        "application": app.model_dump(mode="json"),
                                        "missing_fields": calculate_readiness(
                                            app.model_dump()
                                        ).missing_fields,
                                    },
                                    ensure_ascii=False,
                                ),
                            },
                        ],
                        "response_format": {
                            "type": "json_schema",
                            "json_schema": {
                                "name": "application_analysis",
                                "strict": True,
                                "schema": AISuggestions.model_json_schema(),
                            },
                        },
                    },
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                if not isinstance(content, str) or len(content) > 32000:
                    raise ValueError("Invalid AI content")
                result = AISuggestions.model_validate_json(content)
                fields = [q.field for q in result.questions]
                if len(set(fields)) != len(fields):
                    raise ValueError("Duplicate questions")
                return result
        except httpx.TimeoutException as exc:
            raise APIError(504, "ai_timeout", "ИИ не ответил вовремя. Повторите попытку.") from exc
        except (
            httpx.HTTPError,
            ValidationError,
            KeyError,
            ValueError,
            IndexError,
            TypeError,
        ) as exc:
            raise APIError(
                502, "ai_invalid_response", "Не удалось получить корректный ответ ИИ."
            ) from exc

    def analyze(self, app_id: UUID, profile: Profile) -> ApplicationAnalysis:
        app = self.applications.get(app_id, profile, owner=True)
        if app.status != "draft":
            raise conflict("Анализ доступен только для черновика.")
        suggestions = self.suggestions(app)
        result = ApplicationAnalysis(
            id=uuid4(),
            application_id=app.id,
            application_revision=app.revision,
            summary=suggestions.summary,
            recommendations=suggestions.recommendations,
            questions=[Question(**q.model_dump(), id=uuid4()) for q in suggestions.questions],
            readiness=calculate_readiness(app.model_dump()),
            created_at=datetime.now(UTC),
        )
        row = self.applications.repository.rpc(
            "save_application_analysis",
            {
                "p_owner": str(profile.id),
                "p_data": result.model_dump(mode="json"),
            },
        )
        return ApplicationAnalysis.model_validate(row)

    def latest(self, app_id: UUID, profile: Profile) -> ApplicationAnalysis:
        self.applications.get(app_id, profile, owner=True)
        row = self.applications.repository.latest_analysis(str(app_id))
        if row is None:
            raise not_found()
        return ApplicationAnalysis.model_validate(row)

    def answer(self, app_id: UUID, profile: Profile, payload: Answers) -> Application:
        app = self.applications.get(app_id, profile, owner=True)
        analysis = self.latest(app_id, profile)
        if app.revision != analysis.application_revision:
            raise conflict("Заявка изменена. Выполните анализ повторно.")
        questions = {q.id: q for q in analysis.questions}
        changes: dict[str, str | list[str]] = {}
        seen: set[UUID] = set()
        for answer in payload.answers:
            if answer.question_id not in questions or answer.question_id in seen:
                raise APIError(422, "invalid_question", "Вопрос не найден или повторён.")
            seen.add(answer.question_id)
            question = questions[answer.question_id]
            changes[question.field] = (
                [s.strip() for s in answer.answer.replace(",", ";").split(";") if s.strip()]
                if question.field == "required_skills"
                else answer.answer
            )
        try:
            update = ApplicationUpdate.model_validate(changes)
        except ValidationError as exc:
            raise APIError(422, "invalid_answer", "Ответ не соответствует формату поля.") from exc
        data = update.model_dump(mode="json", exclude_unset=True)
        data["readiness_score"] = calculate_readiness(app.model_dump() | data).score
        row = self.applications.repository.rpc(
            "answer_application_questions",
            {
                "p_owner": str(profile.id),
                "p_analysis_id": str(analysis.id),
                "p_revision": app.revision,
                "p_changes": data,
                "p_answers": [a.model_dump(mode="json") for a in payload.answers],
            },
        )
        return Application.model_validate(row)
