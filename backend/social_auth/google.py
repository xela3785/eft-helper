import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from models.users import User, UserSocialLink


async def get_google_login_url() -> str:
    base = 'https://accounts.google.com/o/oauth2/v2/auth'
    params = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_REDIRECT_URL,
        'response_type': 'code',
        'scope': 'openid email profile',
        'prompt': 'consent',
    }
    url_params = '&'.join(f'{k}={v}' for k, v in params.items())
    return f'{base}?{url_params}'


async def exchange_code_for_token(code: str) -> dict:
    token_url = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': settings.GOOGLE_REDIRECT_URL,
        'grant_type': 'authorization_code',
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        return response.json()


async def get_google_user_info(access_token: str) -> dict:
    url = 'https://openidconnect.googleapis.com/v1/userinfo'
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        return response.json()


async def process_google_callback(code: str, db: AsyncSession) -> tuple[User | None, bool]:
    token_info = await exchange_code_for_token(code)
    access_token = token_info['access_token']

    user_info = await get_google_user_info(access_token)
    email: str | None = user_info.get('email', None)
    provider_id: str | None = user_info.get('sub')

    if not email or not provider_id:
        raise ValueError('Google did not return required information')

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user: User | None = result.scalar_one_or_none()
    created_new = False

    if not user:
        user = User(
            email=email,
            hashed_password=None,
            provider='google',
            provider_id=provider_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        created_new = True

    elif user.provider != 'google':
        result = await db.execute(
            select(UserSocialLink).where(
                UserSocialLink.provider == 'google',
                UserSocialLink.provider_user_id == provider_id,
            )
        )
        link: UserSocialLink | None = result.scalar_one_or_none()
        if not link:
            new_link = UserSocialLink(
                user_id=user.id,
                provider='google',
                provider_user_id=provider_id,
                access_token=access_token,
            )
            db.add(new_link)
            await db.commit()
        else:
            link.access_token = access_token
            await db.commit()

    else:
        result = await db.execute(
            select(UserSocialLink).where(
                UserSocialLink.provider == 'google',
                UserSocialLink.provider_user_id == provider_id,
            )
        )
        link: UserSocialLink | None = result.scalar_one_or_none()
        if link and not link.access_token:
            link.access_token = access_token
            await db.commit()

    return user, created_new
