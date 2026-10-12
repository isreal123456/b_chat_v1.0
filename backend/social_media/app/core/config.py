from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Social Media API"
    debug: bool = False
    database_url: str = "sqlite+aiosqlite:///./social_media.db"
    redis_url: str = ""
    feed_cache_ttl_seconds: int = 30
    secret_key: str = "changfjkhjvgfxhgjgjhon"
    message_encryption_key: str = ""
    access_token_expire_minutes: int = 30

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        if isinstance(value, str) and value.strip().lower() in {"release", "production", "prod"}:
            return False
        if isinstance(value, str) and value.strip().lower() in {"development", "dev"}:
            return True
        return value

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
