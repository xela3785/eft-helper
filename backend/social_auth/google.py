import httpx
from sqlalchemy.orm import Session

from core.config import settings
from models.users import User, UserSocialLink


def get_google_login_url() -> str:
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


def exchange_code_for_token(code: str) -> dict:
    token_url = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': settings.GOOGLE_REDIRECT_URL,
        'grant_type': 'authorization_code',
    }
    with httpx.Client() as client:
        response = client.post(token_url, data=data)
        return response.json()


def get_google_user_info(access_token: str) -> dict:
    url = 'https://openidconnect.googleapis.com/v1/userinfo'
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        return response.json()


def process_google_callback(code: str, db: Session) -> tuple[User | type[User], bool]:
    token_info = exchange_code_for_token(code)
    access_token = token_info['access_token']
    id_token = token_info['id_token']

    user_info = get_google_user_info(access_token)
    email: str | None = user_info.get('email', None)
    provider_id: str | None = user_info.get('sub')

    if not email or not provider_id:
        raise ValueError('Google did not return required information')

    user = db.query(User).filter_by(email=email).first()
    created_new = False

    if not user:
        user = User(
            email=email,
            hashed_password=None,
            provider='google',
            provider_id=provider_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        created_new = True

    elif user.provider != 'google':
        link = db.query(UserSocialLink).filter_by(provider='google', provider_user_id=provider_id).first()
        if not link:
            new_link = UserSocialLink(
                user_id=user.id,
                provider='google',
                provider_user_id=provider_id,
                access_token=access_token,
            )
            db.add(new_link)
            db.commit()
        link.access_token = access_token
        db.commit()

    else:
        link = db.query(UserSocialLink).filter_by(provider='google', provider_user_id=provider_id).first()
        if link and not link.access_token:
            link.access_token = access_token
            db.commit()

    return user, created_new
