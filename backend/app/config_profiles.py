from typing import Literal

from pydantic import BaseModel

from app.config import Settings

Environment = Literal["development", "test", "pilot", "production"]

_FORBIDDEN_SECRETS = frozenset(
    {
        "",
        "dev-secret-change-in-production",
        "changeme",
        "secret",
        "password",
    }
)


class RuntimeProfile(BaseModel):
    environment: Environment
    allow_public_registration: bool
    require_secure_cookies: bool
    allowed_origins: tuple[str, ...]
    require_non_default_secrets: bool


PROFILES: dict[str, RuntimeProfile] = {
    "development": RuntimeProfile(
        environment="development",
        allow_public_registration=True,
        require_secure_cookies=False,
        allowed_origins=("http://localhost:3000", "http://localhost:8443"),
        require_non_default_secrets=False,
    ),
    "test": RuntimeProfile(
        environment="test",
        allow_public_registration=True,
        require_secure_cookies=False,
        allowed_origins=(),
        require_non_default_secrets=False,
    ),
    "pilot": RuntimeProfile(
        environment="pilot",
        allow_public_registration=False,
        require_secure_cookies=True,
        allowed_origins=(),
        require_non_default_secrets=True,
    ),
    "production": RuntimeProfile(
        environment="production",
        allow_public_registration=False,
        require_secure_cookies=True,
        allowed_origins=(),
        require_non_default_secrets=True,
    ),
}


def get_runtime_profile(environment: str) -> RuntimeProfile:
    try:
        return PROFILES[environment]
    except KeyError:
        raise ValueError(f"Unknown environment: {environment!r}") from None


def validate_runtime_settings(settings: Settings) -> None:
    profile = get_runtime_profile(settings.environment)
    if profile.require_non_default_secrets:
        if settings.secret_key in _FORBIDDEN_SECRETS or len(settings.secret_key) < 32:
            raise ValueError(
                "SECRET_KEY must be supplied by secret management "
                "(non-default value, minimum 32 characters) for pilot/production"
            )
    if profile.require_secure_cookies and not settings.cookie_secure:
        raise ValueError("pilot/production requires secure cookies (COOKIE_SECURE=true)")
    if profile.require_non_default_secrets:
        origins = list(settings.allowed_origins)
        if not origins or any(o == "*" for o in origins):
            raise ValueError(
                "allowed_origins must be an explicit non-wildcard list for pilot/production"
            )
