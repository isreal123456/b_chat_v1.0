from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

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
    # Promote this existing account to super admin when no super admin exists.
    bootstrap_admin_email: str = ""

    frontend_url: str = "http://localhost:5173"
    verification_token_expire_minutes: int = 60 * 24
    password_reset_token_expire_minutes: int = 30

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "TickMe <no-reply@tickme.dev>"
    smtp_use_tls: bool = True

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host.strip())

    @property
    def expose_dev_tokens(self) -> bool:
        # Without SMTP there is no other way to complete verification or reset.
        return self.debug or not self.smtp_configured

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        if isinstance(value, str) and value.strip().lower() in {"release", "production", "prod"}:
            return False
        if isinstance(value, str) and value.strip().lower() in {"development", "dev"}:
            return True
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        if not isinstance(value, str) or not value:
            return value

        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://"):]
        if not value.startswith("postgresql://"):
            return value

        parsed = urlsplit(value)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if query.pop("sslmode", None) == "require":
            query["ssl"] = "require"
        query.pop("channel_binding", None)

        return urlunsplit((
            "postgresql+asyncpg",
            parsed.netloc,
            parsed.path,
            urlencode(query),
            parsed.fragment,
        ))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
