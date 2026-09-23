import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa

from app.config import Settings
from app.exceptions import APIError
from app.middleware.authentication import TokenVerifier


@pytest.fixture(params=["ES256", "RS256"])
def signed_tokens(request, monkeypatch):
    algorithm = request.param
    key = (
        ec.generate_private_key(ec.SECP256R1())
        if algorithm == "ES256"
        else (rsa.generate_private_key(public_exponent=65537, key_size=2048))
    )
    converter = jwt.algorithms.ECAlgorithm if algorithm == "ES256" else jwt.algorithms.RSAAlgorithm
    jwk = json.loads(converter.to_jwk(key.public_key())) | {"kid": "test-key", "alg": algorithm}
    settings = Settings(_env_file=None, supabase_url="https://project.supabase.co")
    verifier = TokenVerifier(settings)
    monkeypatch.setattr(verifier.jwks, "fetch_data", lambda: {"keys": [jwk]})
    base = {
        "sub": str(uuid4()),
        "iss": settings.supabase_jwt_issuer,
        "aud": "authenticated",
        "exp": datetime.now(UTC) + timedelta(minutes=5),
        "role": "authenticated",
    }

    def token(changes=None, remove=None, signing_key=None, kid="test-key"):
        claims = base | (changes or {})
        if remove:
            claims.pop(remove)
        return jwt.encode(claims, signing_key or key, algorithm=algorithm, headers={"kid": kid})

    return verifier, token, base, algorithm


def test_valid_signature(signed_tokens):
    verifier, token, base, _ = signed_tokens
    assert str(verifier.verify(token()).id) == base["sub"]


@pytest.mark.parametrize(
    "changes",
    [
        {"aud": "other"},
        {"iss": "https://evil.example"},
        {"sub": "not-a-uuid"},
        {"exp": 1},
        {"role": "service_role"},
        {"nbf": 9999999999},
    ],
)
def test_invalid_claims(signed_tokens, changes):
    verifier, token, _, _ = signed_tokens
    with pytest.raises(APIError) as exc:
        verifier.verify(token(changes))
    assert exc.value.status == 401


@pytest.mark.parametrize("claim", ["exp", "iss", "aud", "sub"])
def test_missing_required_claim(signed_tokens, claim):
    verifier, token, _, _ = signed_tokens
    with pytest.raises(APIError, match="токен"):
        verifier.verify(token(remove=claim))


def test_wrong_signature_and_unknown_key(signed_tokens):
    verifier, token, _, algorithm = signed_tokens
    wrong_key = (
        ec.generate_private_key(ec.SECP256R1())
        if algorithm == "ES256"
        else (rsa.generate_private_key(public_exponent=65537, key_size=2048))
    )
    for value in [token(signing_key=wrong_key), token(kid="unknown")]:
        with pytest.raises(APIError) as exc:
            verifier.verify(value)
        assert exc.value.status == 401


def test_hs256_cannot_use_public_key_as_secret(signed_tokens):
    verifier, _, base, _ = signed_tokens
    value = jwt.encode(base, "attacker-key" * 4, algorithm="HS256", headers={"kid": "test-key"})
    with pytest.raises(APIError) as exc:
        verifier.verify(value)
    assert exc.value.status == 401
