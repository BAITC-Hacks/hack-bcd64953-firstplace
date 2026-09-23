from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.common import InputModel, Timestamps

Role = Literal["business", "student"]
Skill = Annotated[str, Field(min_length=1, max_length=80)]


class BusinessDetails(InputModel):
    organization_name: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=5000)
    contacts: str = Field(default="", max_length=1000)


class StudentDetails(InputModel):
    team_name: str = Field(default="", max_length=200)
    university: str = Field(default="", max_length=200)
    skills: list[Skill] = Field(default_factory=list, max_length=100)
    experience: str = Field(default="", max_length=5000)
    portfolio_url: HttpUrl | None = None


class ProfileUpdate(InputModel):
    role: Role | None = None
    display_name: str = Field(min_length=1, max_length=200)
    avatar_url: HttpUrl | None = None
    business: BusinessDetails | None = None
    student: StudentDetails | None = None


class CurrentUser(BaseModel):
    id: UUID
    email: str = ""


class Profile(Timestamps):
    id: UUID
    user_id: UUID
    role: Role
    display_name: str
    email: str
    avatar_url: str | None = None
    business: BusinessDetails | None = None
    student: StudentDetails | None = None
