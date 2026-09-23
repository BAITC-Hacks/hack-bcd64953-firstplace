from uuid import UUID

from app.config import Settings
from app.exceptions import APIError, conflict, not_found
from app.repositories.profiles import ProfilesRepository
from app.repositories.responses import ResponsesRepository
from app.schemas.analysis import CSVUpload, MatchResult
from app.schemas.common import Page
from app.schemas.profile import Profile, StudentDetails
from app.schemas.response import Decision, Response, ResponseCreate, Team
from app.services.application_service import ApplicationService


class ResponseService:
    def __init__(
        self,
        settings: Settings,
        repository: ResponsesRepository,
        profiles: ProfilesRepository,
        applications: ApplicationService,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.profiles = profiles
        self.applications = applications

    def hydrate(self, row: dict[str, object]) -> Response:
        upload = CSVUpload.model_validate(self.repository.get("csv_uploads", str(row["upload_id"])))
        profile = self.profiles.with_details(self.profiles.get("profiles", str(row["student_id"])))
        evaluation = self.repository.get("ai_evaluations", str(row["evaluation_id"]))
        return Response.model_validate(
            row
            | {
                "team": Team(
                    id=profile["id"],
                    display_name=profile["display_name"],
                    student=StudentDetails.model_validate(profile.get("student", {})),
                    members=upload.members,
                ),
                "evaluation": MatchResult.model_validate(evaluation),
            }
        )

    def create(self, app_id: UUID, profile: Profile, payload: ResponseCreate) -> Response:
        app = self.applications.published(app_id, profile)
        upload = CSVUpload.model_validate(
            self.repository.get("csv_uploads", str(payload.upload_id))
        )
        if upload.student_id != profile.id or upload.application_id != app_id:
            raise not_found()
        evaluation = self.repository.latest_evaluation(str(upload.id))
        if not evaluation or evaluation["application_revision"] != app.revision:
            raise conflict("Сначала проверьте CSV для текущей версии заявки.")
        if evaluation["score"] < self.settings.match_threshold:
            raise APIError(422, "match_below_threshold", "Соответствие ниже порога отправки.")
        row = self.repository.rpc(
            "submit_response",
            {
                "p_application": str(app_id),
                "p_student": str(profile.id),
                "p_upload": str(upload.id),
                "p_threshold": self.settings.match_threshold,
                "p_message": payload.message,
            },
        )
        return self.hydrate(row)

    def get(self, response_id: UUID, profile: Profile) -> Response:
        row = self.repository.get("responses", str(response_id))
        if profile.role == "business":
            self.applications.get(UUID(row["application_id"]), profile, owner=True)
        elif row["student_id"] != str(profile.id):
            raise not_found()
        return self.hydrate(row)

    def list(
        self, profile: Profile, application_id: UUID | None, limit: int, offset: int
    ) -> Page[Response]:
        if application_id and profile.role == "business":
            self.applications.get(application_id, profile, owner=True)
        rows, count = self.repository.list(
            str(profile.id),
            profile.role,
            str(application_id) if application_id else None,
            limit,
            offset,
        )
        return Page[Response](
            items=[self.hydrate(row) for row in rows], total=count, limit=limit, offset=offset
        )

    def decide(self, response_id: UUID, profile: Profile, payload: Decision) -> Response:
        self.get(response_id, profile)
        row = self.repository.rpc(
            "decide_response",
            {
                "p_id": str(response_id),
                "p_business": str(profile.id),
                "p_status": payload.status,
            },
        )
        return self.hydrate(row)

    def team(self, team_id: UUID, profile: Profile) -> Team:
        row = self.repository.team_response(str(profile.id), str(team_id))
        if row is None:
            raise not_found()
        return self.hydrate(row).team
