from uuid import uuid4

import pytest

from app.exceptions import APIError
from app.services.csv_service import parse_csv
from app.services.matching_service import calculate_match
from app.services.readiness_service import calculate_readiness


def test_utf8_bom_and_optional_url(csv_bytes):
    members = parse_csv(b"\xef\xbb\xbf" + csv_bytes, 5242880)
    assert members[0].skills == ["Python", "SQL"]
    assert members[0].experience_years == 2


@pytest.mark.parametrize(
    "payload",
    [
        b"",
        b"\xff\xfe",
        b"\x00",
        b"name,email\nA,x@y.com\n",
        b"member_name,email,university,skills,experience_years,email\nA,a@b.co,U,SQL,2,x@y.co\n",
        b"member_name,email,university,skills,experience_years\nA,a@b.co,U,SQL,2,EXTRA\n",
        b"member_name,email,university,skills,experience_years\nA,a@b.co,U,SQL,NaN\n",
        b"member_name,email,university,skills,experience_years\nA,a@b.co,U,SQL,inf\n",
        b"member_name,email,university,skills,experience_years\n=CMD(),a@b.co,U,SQL,2\n",
        b"member_name,email,university,skills,experience_years\nA,invalid,U,SQL,2\n",
        b"member_name,email,university,skills,experience_years\nA,a@b.co,U,,2\n",
        b"member_name,email,university,skills,experience_years\nA,a@b.co,U,SQL,2\nB,a@b.co,U,SQL,2\n",
        b"member_name,email,university,skills,experience_years,portfolio_url\nA,a@b.co,U,SQL,2,javascript:evil\n",
    ],
)
def test_reject_invalid_csv(payload):
    with pytest.raises(APIError) as exc:
        parse_csv(payload, 5242880)
    assert exc.value.status == 422


def test_limits(csv_bytes):
    with pytest.raises(APIError) as exc:
        parse_csv(csv_bytes, 2)
    assert exc.value.status == 413
    header = csv_bytes.splitlines()[0] + b"\n"
    rows = b"".join(f"A,a{i}@b.co,U,SQL,2,\n".encode() for i in range(51))
    with pytest.raises(APIError):
        parse_csv(header + rows, 5242880)


def test_server_scores(application, csv_bytes):
    assert calculate_readiness(application.model_dump()).score == 100
    assert calculate_readiness({"description": "A description"}).score == 10
    members = parse_csv(csv_bytes, 5242880)
    result = calculate_match(application, members, uuid4(), uuid4(), 90)
    assert result.score == 100 and result.eligible
    members[0].skills = ["python"]
    result = calculate_match(application, members, uuid4(), uuid4(), 90)
    assert result.score == 57 and not result.eligible
    assert result.missing_skills == ["sql"]


def test_threshold_not_rounded_up(application, csv_bytes):
    members = parse_csv(csv_bytes, 5242880)
    members[0].experience_years = 0.65
    result = calculate_match(application, members, uuid4(), uuid4(), 90)
    assert result.score == 89 and not result.eligible
    members[0].experience_years = 0.67
    assert calculate_match(application, members, uuid4(), uuid4(), 90).eligible
