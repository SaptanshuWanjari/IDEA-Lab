import pytest
from fastapi import HTTPException

from app.services.auth_service import AuthService, pwd_context


@pytest.mark.asyncio
async def test_register_user(session):
    service = AuthService(session)
    user = await service.register("auth-test@pravah.in", "secret")
    assert user.email == "auth-test@pravah.in"
    assert pwd_context.verify("secret", user.hashed_password)


@pytest.mark.asyncio
async def test_register_duplicate(session):
    service = AuthService(session)
    await service.register("dup@pravah.in", "secret")
    with pytest.raises(ValueError, match="already registered"):
        await service.register("dup@pravah.in", "secret")


@pytest.mark.asyncio
async def test_authenticate(session):
    service = AuthService(session)
    await service.register("login@pravah.in", "secret")
    user = await service.authenticate("login@pravah.in", "secret")
    assert user.email == "login@pravah.in"


@pytest.mark.asyncio
async def test_authenticate_wrong_password(session):
    service = AuthService(session)
    await service.register("bad@pravah.in", "secret")
    with pytest.raises(ValueError, match="Invalid credentials"):
        await service.authenticate("bad@pravah.in", "wrong")


def test_create_and_decode_token(session):
    from uuid import uuid4
    service = AuthService(session)
    uid = uuid4()
    access, refresh = service.create_tokens(uid)
    assert access != refresh
    decoded = service.decode_token(access, "access")
    assert decoded == uid


def test_decode_wrong_token_type(session):
    from uuid import uuid4
    service = AuthService(session)
    uid = uuid4()
    _, refresh = service.create_tokens(uid)
    with pytest.raises(ValueError, match="Invalid token type"):
        service.decode_token(refresh, "access")
