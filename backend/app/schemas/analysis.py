from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import InputModel

QuestionField = Literal[
    "title",
    "goal",
    "target_audience",
    "expected_result",
    "timeline",
    "available_data",
    "success_criteria",
    "required_skills",
]


class AIQuestion(InputModel):
    field: QuestionField
    question: str = Field(min_length=5, max_length=1000)


class AISuggestions(InputModel):
    summary: str = Field(min_length=1, max_length=3000)
    questions: list[AIQuestion] = Field(max_length=8)
    recommendations: list[str] = Field(max_length=10)


class Question(AIQuestion):
    id: UUID
    answer: str | None = None


class Readiness(BaseModel):
    score: int
    filled_fields: list[str]
    missing_fields: list[str]


class ApplicationAnalysis(BaseModel):
    id: UUID
    application_id: UUID
    application_revision: int
    summary: str
    recommendations: list[str]
    questions: list[Question]
    readiness: Readiness
    created_at: datetime


class Answer(InputModel):
    question_id: UUID
    answer: str = Field(min_length=1, max_length=3000)


class Answers(InputModel):
    answers: list[Answer] = Field(min_length=1, max_length=8)


class TeamMember(InputModel):
    member_name: str
    email: str
    university: str
    skills: list[str]
    experience_years: float
    portfolio_url: str | None = None


class CSVUpload(BaseModel):
    id: UUID
    application_id: UUID
    student_id: UUID
    filename: str
    members: list[TeamMember]
    created_at: datetime


class MatchResult(BaseModel):
    id: UUID
    upload_id: UUID
    application_id: UUID
    student_id: UUID
    application_revision: int
    score: int = Field(ge=0, le=100)
    eligible: bool
    threshold: int
    matched_skills: list[str]
    missing_skills: list[str]
    experience_score: int
    explanation: str
    created_at: datetime
