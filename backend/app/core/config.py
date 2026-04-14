import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from functools import lru_cache
from typing import List, Optional

_INSECURE_DEFAULTS = {
    "change-this-in-production-please-use-a-long-random-string",
    "change-this-in-production-use-a-long-random-string",
}


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "MagNumAI Identity & Security Gateway"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "change-this-in-production-please-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    @model_validator(mode="after")
    def _check_production_secrets(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY in _INSECURE_DEFAULTS:
                raise ValueError(
                    "FATAL: SECRET_KEY is still set to an insecure default. "
                    "Set a strong SECRET_KEY via environment variable before deploying. "
                    "Generate one with: openssl rand -hex 32"
                )
            if self.FIRST_ADMIN_PASSWORD == "changeme123!":
                warnings.warn(
                    "WARNING: FIRST_ADMIN_PASSWORD is still the default 'changeme123!'. "
                    "Change it via the FIRST_ADMIN_PASSWORD environment variable.",
                    stacklevel=2,
                )
        return self

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/magnumai"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    # OpenAI (used for LLM-based detection)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Risk thresholds
    RISK_SCORE_BLOCK_THRESHOLD: float = 0.8
    RISK_SCORE_WARN_THRESHOLD: float = 0.5

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Admin
    FIRST_ADMIN_EMAIL: str = "admin@magnumai.io"
    FIRST_ADMIN_PASSWORD: str = "changeme123!"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
