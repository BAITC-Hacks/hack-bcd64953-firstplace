import math
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.schemas.analysis import MatchResult, TeamMember
from app.schemas.application import Application


def calculate_match(
    app: Application, members: list[TeamMember], upload_id: UUID, student_id: UUID, threshold: int
) -> MatchResult:
    required = {skill.strip().casefold() for skill in app.required_skills}
    available = {skill.strip().casefold() for member in members for skill in member.skills}
    matched = sorted(required & available)
    missing = sorted(required - available)
    skill_score = 85 * len(matched) / len(required) if required else 85
    experience = max((m.experience_years for m in members), default=0)
    experience_ratio = (
        min(1.0, experience / app.min_experience_years) if (app.min_experience_years > 0) else 1.0
    )
    score = math.floor(skill_score + 15 * experience_ratio)
    explanation = f"Покрытие навыков: {len(matched)}/{len(required)}. "
    if missing:
        explanation += "Не хватает навыков: " + ", ".join(missing) + ". "
    if experience_ratio < 1:
        explanation += f"Опыт: {experience:g} лет при требовании {app.min_experience_years:g}. "
    explanation += "Можно отправить отклик." if score >= threshold else "Отклик не отправлен."
    return MatchResult(
        id=uuid4(),
        upload_id=upload_id,
        application_id=app.id,
        student_id=student_id,
        application_revision=app.revision,
        score=score,
        eligible=score >= threshold,
        threshold=threshold,
        matched_skills=matched,
        missing_skills=missing,
        experience_score=math.floor(15 * experience_ratio),
        explanation=explanation,
        created_at=datetime.now(UTC),
    )
