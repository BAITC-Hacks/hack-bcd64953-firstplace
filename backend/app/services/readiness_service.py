from typing import Any

from app.schemas.analysis import Readiness

WEIGHTS = {
    "title": 5,
    "description": 10,
    "goal": 15,
    "target_audience": 10,
    "expected_result": 15,
    "timeline": 10,
    "available_data": 10,
    "success_criteria": 15,
    "required_skills": 10,
}


def calculate_readiness(data: dict[str, Any]) -> Readiness:
    filled = [
        name
        for name in WEIGHTS
        if data.get(name) and (not isinstance(data[name], str) or data[name].strip())
    ]
    return Readiness(
        score=sum(WEIGHTS[name] for name in filled),
        filled_fields=filled,
        missing_fields=[name for name in WEIGHTS if name not in filled],
    )
