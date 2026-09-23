import csv
import io
import math
import re
from pathlib import PurePosixPath
from uuid import UUID, uuid4

import pandas as pd
from pydantic import HttpUrl, TypeAdapter, ValidationError

from app.config import Settings
from app.exceptions import APIError, conflict, not_found
from app.repositories.responses import ResponsesRepository
from app.schemas.analysis import CSVUpload, MatchResult, TeamMember
from app.schemas.profile import Profile
from app.services.application_service import ApplicationService
from app.services.matching_service import calculate_match
from app.services.storage_service import StorageService

REQUIRED_COLUMNS = {"member_name", "email", "university", "skills", "experience_years"}
OPTIONAL_COLUMNS = {"portfolio_url"}


def parse_csv(data: bytes, max_bytes: int) -> list[TeamMember]:
    if len(data) > max_bytes:
        raise APIError(413, "csv_too_large", "CSV превышает допустимый размер.")
    try:
        text = data.decode("utf-8-sig")
        if "\x00" in text or not text.strip():
            raise ValueError("Empty or binary file")
        reader = csv.reader(io.StringIO(text), strict=True)
        header = next(reader)
        if len(set(header)) != len(header) or not REQUIRED_COLUMNS <= set(header):
            raise ValueError("Missing or duplicate columns")
        if set(header) - REQUIRED_COLUMNS - OPTIONAL_COLUMNS:
            raise ValueError("Unexpected columns")
        rows: list[list[str]] = []
        for row in reader:
            if len(rows) >= 50 or len(row) != len(header):
                raise ValueError("Invalid row count or width")
            if any(
                len(cell) > 2000 or cell.lstrip().startswith(("=", "+", "-", "@")) for cell in row
            ):
                raise ValueError("Unsafe or oversized cell")
            rows.append(row)
        if not rows:
            raise ValueError("No team members")
        # csv.reader first prevents pandas silently accepting duplicate headers / extra cells.
        frame = pd.read_csv(io.StringIO(text), dtype=str, keep_default_na=False)
        members = []
        emails: set[str] = set()
        for raw in frame.to_dict(orient="records"):
            values = {str(k): str(v).strip() for k, v in raw.items()}
            if any(not values[name] for name in REQUIRED_COLUMNS):
                raise ValueError("Required cell is empty")
            email = values["email"].casefold()
            if not re.fullmatch(r"[^\s@,]+@[^\s@,]+\.[^\s@,]+", email) or email in emails:
                raise ValueError("Invalid or duplicate email")
            emails.add(email)
            experience = float(values["experience_years"])
            if not math.isfinite(experience) or not 0 <= experience <= 80:
                raise ValueError("Invalid experience")
            skills = sorted({s.strip() for s in re.split(r"[;|]", values["skills"]) if s.strip()})
            if not skills or len(skills) > 100 or any(len(s) > 80 for s in skills):
                raise ValueError("Invalid skills")
            portfolio = values.get("portfolio_url") or None
            if portfolio:
                portfolio = str(TypeAdapter(HttpUrl).validate_python(portfolio))
            members.append(
                TeamMember(
                    member_name=values["member_name"],
                    email=email,
                    university=values["university"],
                    skills=skills,
                    experience_years=experience,
                    portfolio_url=portfolio,
                )
            )
        return members
    except (UnicodeError, ValueError, csv.Error, StopIteration, ValidationError) as exc:
        raise APIError(
            422,
            "invalid_csv",
            "Некорректный CSV. Проверьте UTF-8, заголовки, "
            "заполненные поля и число участников (1–50).",
        ) from exc


class CSVService:
    def __init__(
        self,
        settings: Settings,
        applications: ApplicationService,
        repository: ResponsesRepository,
        storage: StorageService,
    ) -> None:
        self.settings = settings
        self.applications = applications
        self.repository = repository
        self.storage = storage

    def upload(self, app_id: UUID, profile: Profile, filename: str, data: bytes) -> CSVUpload:
        self.applications.published(app_id, profile)
        safe_name = PurePosixPath(filename.replace("\\", "/")).name
        if not safe_name.lower().endswith(".csv") or len(safe_name) > 200:
            raise APIError(422, "invalid_filename", "Выберите файл с расширением .csv.")
        members = parse_csv(data, self.settings.max_csv_size_mb * 1024 * 1024)
        upload_id = uuid4()
        path = f"{profile.id}/{app_id}/{upload_id}.csv"
        self.storage.upload(path, data)
        try:
            row = self.repository.insert(
                "csv_uploads",
                {
                    "id": str(upload_id),
                    "application_id": str(app_id),
                    "student_id": str(profile.id),
                    "filename": safe_name,
                    "storage_path": path,
                    "size_bytes": len(data),
                    "members": [m.model_dump(mode="json") for m in members],
                },
            )
        except Exception:
            self.storage.remove(path)
            raise
        return CSVUpload.model_validate(row)

    def get(self, app_id: UUID, upload_id: UUID, profile: Profile) -> CSVUpload:
        upload = CSVUpload.model_validate(self.repository.get("csv_uploads", str(upload_id)))
        if upload.student_id != profile.id or upload.application_id != app_id:
            raise not_found()
        return upload

    def analyze(self, app_id: UUID, upload_id: UUID, profile: Profile) -> MatchResult:
        app = self.applications.published(app_id, profile)
        upload = self.get(app_id, upload_id, profile)
        existing = self.repository.latest_evaluation(str(upload_id))
        if existing and existing["application_revision"] == app.revision:
            return MatchResult.model_validate(existing)
        result = calculate_match(
            app, upload.members, upload_id, profile.id, self.settings.match_threshold
        )
        row = self.repository.rpc(
            "save_match_evaluation", {"p_data": result.model_dump(mode="json")}
        )
        return MatchResult.model_validate(row)

    def result(self, app_id: UUID, upload_id: UUID, profile: Profile) -> MatchResult:
        self.get(app_id, upload_id, profile)
        row = self.repository.latest_evaluation(str(upload_id))
        if row is None:
            raise conflict("CSV ещё не проанализирован.")
        return MatchResult.model_validate(row)
