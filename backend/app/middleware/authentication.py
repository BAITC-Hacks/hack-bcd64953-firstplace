from uuid import UUID

import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError

from app.config import Settings
from app.exceptions import APIError
from app.schemas.profile import CurrentUser


class TokenVerifier:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.jwks = (
            PyJWKClient(settings.supabase_jwks_url, lifespan=300, timeout=5)
            if settings.supabase_jwks_url
            else None
        )

    def verify(self, token: str) -> CurrentUser:
        if self.jwks is None or not self.settings.supabase_jwt_issuer:
            raise APIError(503, "auth_unavailable", "Авторизация ещё не настроена.")
        try:
            header = jwt.get_unverified_header(token)
            if header.get("alg") not in {"ES256", "RS256"} or not header.get("kid"):
                raise jwt.InvalidTokenError("Unsupported signing key")
            key = self.jwks.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
                issuer=self.settings.supabase_jwt_issuer,
                options={"require": ["exp", "iss", "aud", "sub"]},
            )
            if claims.get("role") != "authenticated":
                raise jwt.InvalidTokenError("Not a user access token")
            return CurrentUser(id=UUID(claims["sub"]), email=claims.get("email") or "")
        except PyJWKClientConnectionError as exc:
            raise APIError(503, "auth_unavailable", "Сервис авторизации недоступен.") from exc
        except (jwt.PyJWTError, ValueError, TypeError, KeyError) as exc:
            raise APIError(401, "invalid_token", "Недействительный или истёкший токен.") from exc
