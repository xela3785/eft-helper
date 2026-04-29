import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from models.users import User, UserSocialLink


async def get_github_login_url() -> str:
    base = 'https://github.com/login/oauth/authorize'
    params = {
        'client_id': settings.GITHUB_CLIENT_ID,
        'redirect_uri': settings.GITHUB_REDIRECT_URL,
        'scope': 'user:email read:user'
    }
    url_params = '&'.join([f'{k}={v}' for k, v in params.items()])
    return f'{base}?{url_params}'


async def exchange_code_for_token(code: str) -> str:
    token_url = 'https://github.com/login/oauth/access_token'
    headers = {'Accept': 'application/json'}
    data = {
        'code': code,
        'client_id': settings.GITHUB_CLIENT_ID,
        'client_secret': settings.GITHUB_CLIENT_SECRET,
        'redirect_uri': settings.GITHUB_REDIRECT_URL,
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data, headers=headers)
        return response.json()['access_token']


async def get_github_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        headers = {'Authorization': f'token {access_token}'}
        first_response = await client.get('https://api.github.com/user', headers=headers)
        user_data = first_response.json()
        user_id = str(user_data['id'])
        loing = user_data['login']

        second_response = await client.get('https://api.github.com/user/emails', headers=headers)
        emails = second_response.json()
        email = next((e['email'] for e in emails if not e['primary'] == False or not e['verified']), None)

        return {'login': loing, 'id': user_id, 'email': email}


async def process_github_callback(code: str, db: AsyncSession) -> tuple[User | None, bool]:
    access_token = await exchange_code_for_token(code)
    info = await get_github_user_info(access_token)

    if not info.get('email', None):
        raise ValueError('Github user has no public email address')

    provider_id = info['id']
    email = info['email']

    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user: User | None = result.scalar_one_or_none()
    created_new = False

    if not user:
        user = User(
            email=email,
            hashed_password=None,
            provider='github',
            provider_id=provider_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        created_new = True

    elif user.provider != 'github':
        stmt = select(UserSocialLink).where(
            UserSocialLink.provider == 'github', UserSocialLink.provider_user_id == provider_id
        )
        result = await db.execute(stmt)
        link: UserSocialLink | None = result.scalar_one_or_none()
        if not link:
            new_link = UserSocialLink(
                user_id=user.id,
                provider='github',
                provider_user_id=provider_id,
                access_token=access_token,
            )
            db.add(new_link)
            await db.commit()
        else:
            link.access_token = access_token
            await db.commit()

    else:
        stmt = select(User).where(
            UserSocialLink.provider == 'github',
            UserSocialLink.provider_user_id == provider_id
        )
        result = await db.execute(stmt)
        link: UserSocialLink | None = result.scalar_one_or_none()
        if link and not link.access_token:
            link.access_token = access_token
            await db.commit()

    return user, created_new
