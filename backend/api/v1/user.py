from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends

from api.dependencies import get_user_service, get_auth_service, get_current_active_user
from models.sql_models import User
from schemas.user import UserCreate, UserResponse, UserLogin
from services.user_services import UserService, AuthenticationService

router = APIRouter()


@router.post('/register', response_model=UserResponse)
def register(
        user_data: UserCreate,
        user_service: UserService = Depends(get_user_service)
):
    return user_service.create_user(user_data)


@router.post('/login')
def login(
        user_data: UserLogin,
        auth_service: AuthenticationService = Depends(get_auth_service)
):
    user = auth_service.authenticate_user(user_data.username, user_data.password)
    response = auth_service.set_cookie_tokens(
        data={'sub': user.username}
    )
    return response

@router.get('/me', response_model=UserResponse)
def get_me(
        current_user: Annotated[User, Depends(get_current_active_user)]
):
    return current_user


@router.post('/logout')
def logout(
        auth_service: AuthenticationService = Depends(get_auth_service)
):
    response = auth_service.logout_user()
    return response
