from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    app_env: Literal["development", "test", "production"] = "development"
    app_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    extra_cors_origins: list[str] = Field(default_factory=list)
    supabase_url: str = ""
    supabase_anon_key: SecretStr = SecretStr("")
    supabase_service_role_key: SecretStr = SecretStr("")
    supabase_jwt_issuer: str = ""
    supabase_jwks_url: str = ""
    ai_api_key: SecretStr = SecretStr("")
    ai_model: str = ""
    ai_base_url: str = ""
    max_csv_size_mb: int = Field(default=5, ge=1, le=5)
    match_threshold: int = Field(default=90, ge=90, le=100)
    storage_bucket: str = "team-csv"

    @model_validator(mode="after")
    def validate_configuration(self) -> Settings:
        self.supabase_url = self.supabase_url.rstrip("/")
        if self.supabase_url:
            self.supabase_jwt_issuer = self.supabase_jwt_issuer or (self.supabase_url + "/auth/v1")
            self.supabase_jwks_url = self.supabase_jwks_url or (
                self.supabase_jwt_issuer + "/.well-known/jwks.json"
            )
        if self.app_env == "production":
            if not self.supabase_url or not self.supabase_service_role_key.get_secret_value():
                raise ValueError("Supabase must be configured in production")
            for url in [
                self.supabase_url,
                self.supabase_jwt_issuer,
                self.supabase_jwks_url,
                self.frontend_url,
                *self.extra_cors_origins,
            ]:
                if not url.startswith("https://"):
                    raise ValueError("Production URLs must use HTTPS")
        if "*" in self.extra_cors_origins or self.frontend_url == "*":
            raise ValueError("CORS requires explicit origins")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
