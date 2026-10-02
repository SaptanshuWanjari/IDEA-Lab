import pytest

from app.config import Settings
from app.config_profiles import get_runtime_profile, validate_runtime_settings


def test_pilot_profile_rejects_default_secret():
    settings = Settings(environment="pilot", secret_key="dev-secret-change-in-production")
    with pytest.raises(ValueError, match="SECRET_KEY"):
        validate_runtime_settings(settings)


def test_pilot_profile_requires_https_cookie_settings():
    settings = Settings(environment="pilot", secret_key="x" * 48, cookie_secure=False)
    with pytest.raises(ValueError, match="secure cookies"):
        validate_runtime_settings(settings)


def test_pilot_profile_rejects_wildcard_origins():
    settings = Settings(
        environment="pilot",
        secret_key="x" * 48,
        cookie_secure=True,
        allowed_origins=["*"],
    )
    with pytest.raises(ValueError, match="allowed_origins"):
        validate_runtime_settings(settings)


def test_development_profile_allows_defaults():
    settings = Settings()
    validate_runtime_settings(settings)


def test_get_runtime_profile_flags():
    pilot = get_runtime_profile("pilot")
    assert pilot.require_secure_cookies is True
    assert pilot.require_non_default_secrets is True
    assert pilot.allow_public_registration is False
    dev = get_runtime_profile("development")
    assert dev.allow_public_registration is True
