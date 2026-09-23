from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.analysis import MatchResult, TeamMember
from app.schemas.common import InputModel, Timestamps
from app.schemas.profile import StudentDetails


class ResponseCreate(InputModel):
    upload_id: UUID
    message: str = Field(default="", max_length=3000)


class Decision(InputModel):
    status: Literal["accepted", "rejected"]


class Team(BaseModel):
    id: UUID
    display_name: str
    student: StudentDetails
    members: list[TeamMember]


class Response(Timestamps):
    id: UUID
    application_id: UUID
    student_id: UUID
    upload_id: UUID
    evaluation_id: UUID
    status: Literal["pending", "accepted", "rejected"]
    message: str
    decided_at: datetime | None = None
    team: Team
    evaluation: MatchResult
