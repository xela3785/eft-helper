import pytest
from fastapi import HTTPException

from core.config import settings
from schemas.user import UserCreate
from services.user_services import AuthenticationService, UserService


@pytest.mark.asyncio
async def test_create_user_success(db_session):
    service = UserService(db_session)

    created = await service.create_user(
        UserCreate(email="user@example.com", password="secret123")
    )

    assert created.id is not None
    assert created.email == "user@example.com"
    assert created.hashed_password != "secret123"


@pytest.mark.asyncio
async def test_create_user_duplicate_email_raises_400(db_session):
    service = UserService(db_session)
    payload = UserCreate(email="dupe@example.com", password="secret123")
    await service.create_user(payload)

    with pytest.raises(HTTPException) as exc_info:
        await service.create_user(payload)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Email already registered"


@pytest.mark.asyncio
async def test_authenticate_user_success(db_session):
    user_service = UserService(db_session)
    auth_service = AuthenticationService(db_session)
    created = await user_service.create_user(
        UserCreate(email="auth@example.com", password="secret123")
    )

    auth_user = await auth_service.authenticate_user("auth@example.com", "secret123")

    assert auth_user.id == created.id
    assert auth_user.email == created.email


@pytest.mark.asyncio
async def test_authenticate_user_with_wrong_password_raises_400(db_session):
    user_service = UserService(db_session)
    auth_service = AuthenticationService(db_session)
    await user_service.create_user(
        UserCreate(email="badpass@example.com", password="secret123")
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.authenticate_user("badpass@example.com", "wrong-password")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Incorrect Password"


@pytest.mark.asyncio
async def test_generate_and_validate_tokens(db_session):
    auth_service = AuthenticationService(db_session)
    settings.SECRET_KEY = "test-secret-key-with-at-least-32-bytes"
    settings.ALGORITHM = "HS256"

    tokens = await auth_service.generate_tokens({"sub": "42"})
    user_id = await auth_service.validate_refresh_token(tokens["refresh_token"])
    invalid_user_id = await auth_service.validate_refresh_token("invalid.token.value")

    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert user_id == "42"
    assert invalid_user_id is None
