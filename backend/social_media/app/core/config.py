from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Social Media API"
    debug: bool = False
    database_url: str = "sqlite+aiosqlite:///./social_media.db"
    secret_key: str = "changfjkhjvgfxhgjgjhon"
    message_encryption_key: str = ""
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
