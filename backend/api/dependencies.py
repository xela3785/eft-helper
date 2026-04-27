from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from starlette.requests import Request

from core.database import get_db
from models.users import User
from services.user_services import UserService, AuthenticationService


async def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)


async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthenticationService:
    return AuthenticationService(db)


async def get_current_active_user(
        request: Request,
        user_service: UserService = Depends(get_user_service)
) -> type[User]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authencticate': 'Bearer'}
    )

    if (payload := getattr(request.state, 'user_payload', None)) is None:
        raise credentials_exception

    user_id: int | None = int(payload.get('sub', None))
    if user_id is None:
        raise credentials_exception

    try:
        user = await user_service.get_user(user_id=user_id)
        return user
    except HTTPException:
        raise credentials_exception
