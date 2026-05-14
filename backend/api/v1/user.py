from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_user_service, get_auth_service, get_current_active_user
from core.database import get_db
from models.users import User
from schemas.user import UserCreate, UserResponse, UserLogin
from services.user_services import UserService, AuthenticationService
from social_auth.github import get_github_login_url, process_github_callback
from social_auth.google import get_google_login_url, process_google_callback

router = APIRouter()


@router.get('/google')
async def google_login():
    url = await get_google_login_url()
    return RedirectResponse(url=url)


@router.get('/github')
async def github_login():
    url = await get_github_login_url()
    return RedirectResponse(url=url)


@router.get('/google/callback')
async def google_callback(
        code: str,
        db: AsyncSession = Depends(get_db),
        auth_service: AuthenticationService = Depends(get_auth_service),
):
    try:
        user, created = await process_google_callback(code, db)
    except Exception as e:
        return {'error': f'Auth failed: {str(e)}'}

    response = RedirectResponse(url='http://127.0.0.1:3000/dashboard/')
    response = await auth_service.set_cookie_tokens(
        response=response,
        data={'sub': str(user.id)}
    )
    return response


@router.get('/github/callback')
async def github_callback(
        code: str,
        db: AsyncSession = Depends(get_db),
        auth_service: AuthenticationService = Depends(get_auth_service),
):
    try:
        user, created = await process_github_callback(code, db)
    except Exception as e:
        return {'error': f'Auth failed: {str(e)}'}

    response = RedirectResponse(url='http://127.0.0.1:3000/dashboard/')
    response = await auth_service.set_cookie_tokens(
        response=response,
        data={'sub': str(user.id)}
    )
    return response


@router.post('/register', response_model=UserResponse)
async def register(
        user_data: UserCreate,
        user_service: UserService = Depends(get_user_service)
):
    return await user_service.create_user(user_data)


@router.post('/login')
async def login(
        user_data: UserLogin,
        auth_service: AuthenticationService = Depends(get_auth_service)
):
    user = await auth_service.authenticate_user(user_data.email, user_data.password)
    response = await auth_service.set_cookie_tokens(
        data={'sub': str(user.id)}
    )
    return response


@router.get('/me', response_model=UserResponse)
async def get_me(
        current_user: Annotated[User, Depends(get_current_active_user)]
):
    return current_user


@router.post('/logout')
async def logout(
        auth_service: AuthenticationService = Depends(get_auth_service)
):
    response = await auth_service.logout_user()
    return response
