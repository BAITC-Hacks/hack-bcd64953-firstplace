from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.common import InputModel, Timestamps
from app.schemas.profile import Skill

ApplicationStatus = Literal["draft", "published", "closed"]


class ApplicationCreate(InputModel):
    title: str = Field(default="", max_length=200)
    description: str = Field(min_length=20, max_length=10000)
    goal: str = Field(default="", max_length=3000)
    target_audience: str = Field(default="", max_length=3000)
    expected_result: str = Field(default="", max_length=3000)
    timeline: str = Field(default="", max_length=1000)
    available_data: str = Field(default="", max_length=3000)
    success_criteria: str = Field(default="", max_length=3000)
    required_skills: list[Skill] = Field(default_factory=list, max_length=100)
    min_experience_years: float = Field(default=0, ge=0, le=80, allow_inf_nan=False)


class ApplicationUpdate(InputModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, min_length=20, max_length=10000)
    goal: str | None = Field(default=None, max_length=3000)
    target_audience: str | None = Field(default=None, max_length=3000)
    expected_result: str | None = Field(default=None, max_length=3000)
    timeline: str | None = Field(default=None, max_length=1000)
    available_data: str | None = Field(default=None, max_length=3000)
    success_criteria: str | None = Field(default=None, max_length=3000)
    required_skills: list[Skill] | None = Field(default=None, max_length=100)
    min_experience_years: float | None = Field(default=None, ge=0, le=80, allow_inf_nan=False)

    @model_validator(mode="after")
    def reject_null(self) -> ApplicationUpdate:
        if not self.model_fields_set or any(
            getattr(self, name) is None for name in self.model_fields_set
        ):
            raise ValueError("Provide at least one field; explicit null is not allowed")
        return self


class Application(ApplicationCreate, Timestamps):
    id: UUID
    business_id: UUID
    organization_name: str = ""
    status: ApplicationStatus
    revision: int
    readiness_score: int = Field(ge=0, le=100)
