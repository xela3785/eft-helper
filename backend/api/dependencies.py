from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.requests import Request

from core.database import get_db
from models.sql_models import User
from services.user_services import UserService, AuthenticationService


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)


def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    return AuthenticationService(db)


def get_current_active_user(
        request: Request,
        user_service: UserService = Depends(get_user_service)
) -> type[User]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authencticate': 'Bearer'}
    )

    payload = getattr(request.state, 'user_payload', None)
    if payload is None:
        raise credentials_exception

    username: str | None = payload.get('sub')
    if username is None:
        raise credentials_exception

    try:
        user = user_service.get_user_by_username(username=username)
        return user
    except HTTPException:
        raise credentials_exception
