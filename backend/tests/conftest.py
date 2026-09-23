from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.schemas.application import Application
from app.schemas.profile import BusinessDetails, Profile, StudentDetails


@pytest.fixture
def business():
    now = datetime.now(UTC)
    return Profile(
        id=uuid4(),
        user_id=uuid4(),
        role="business",
        display_name="Business",
        email="business@example.com",
        business=BusinessDetails(organization_name="Sana"),
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def student():
    now = datetime.now(UTC)
    return Profile(
        id=uuid4(),
        user_id=uuid4(),
        role="student",
        display_name="Student",
        email="student@example.com",
        student=StudentDetails(team_name="Team"),
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def application(business):
    now = datetime.now(UTC)
    return Application(
        id=uuid4(),
        business_id=business.id,
        title="Project",
        description="A sufficiently detailed project description",
        goal="Help customers",
        target_audience="Customers",
        expected_result="Prototype",
        timeline="4 weeks",
        available_data="Anonymized requests",
        success_criteria="90% correct responses",
        required_skills=["Python", "SQL"],
        min_experience_years=2,
        status="published",
        revision=2,
        readiness_score=100,
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def csv_bytes():
    return (
        b"member_name,email,university,skills,experience_years,portfolio_url\n"
        b"Ayan,ayan@example.com,KBTU,Python;SQL,2,https://example.com/portfolio\n"
    )
