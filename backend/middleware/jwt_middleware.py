import jwt
from fastapi import Request, Response
from jwt import ExpiredSignatureError, InvalidTokenError, DecodeError
from starlette.middleware.base import BaseHTTPMiddleware

from api.dependencies import get_auth_service
from core.config import settings


class JWTTokenRefreshMiddleware(BaseHTTPMiddleware):

    async def dispatch(
            self,
            request: Request,
            call_next,
    ) -> Response:

        access_token, refresh_token = await self.get_tokens(request)

        token_needs_refresh = False
        request.state.user_payload = None
        auth_service = get_auth_service()

        if access_token:
            try:
                payload = jwt.decode(
                    access_token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                request.state.user_payload = payload

                response = await call_next(request)
                return response

            except ExpiredSignatureError:
                token_needs_refresh = True
            except (InvalidTokenError, DecodeError):
                token_needs_refresh = True
        else:
            token_needs_refresh = True

        if token_needs_refresh and refresh_token:
            try:
                new_tokens = await self.get_new_tokens(refresh_token)
                if new_tokens and 'access_token' in new_tokens:
                    new_access_token = new_tokens['access_token']
                    new_refresh_token = new_tokens['refresh_token']

                    try:
                        new_payload = jwt.decode(
                            new_access_token,
                            settings.SECRET_KEY,
                            algorithms=[settings.ALGORITHM]
                        )
                        request.state.user_payload = new_payload
                    except (InvalidTokenError, DecodeError, ExpiredSignatureError):
                        request.state.user_payload = None

                    response = await call_next(request)

                    response = auth_service.set_access_token(
                        new_access_token, new_tokens.get('access_token_expire'), response
                    )
                    response = auth_service.set_refresh_token(
                        new_refresh_token, new_tokens.get('refresh_token_expire'), response
                    )

                    return response

            except InvalidTokenError:
                response = await call_next(request)
                return auth_service.logout_user(response)
            except Exception as e:
                response = await call_next(request)
                return auth_service.logout_user(response)

        response = await call_next(request)
        return response

    @staticmethod
    async def get_tokens(request: Request) -> tuple[str | None, str | None]:
        access_token = request.cookies.get('access_token')
        refresh_token = request.cookies.get('refresh_token')
        return access_token, refresh_token

    @staticmethod
    async def get_new_tokens(
            refresh_token: str,
    ) -> dict | None:
        auth_service = get_auth_service()
        user_id = auth_service.validate_refresh_token(refresh_token)
        if not user_id:
            raise InvalidTokenError('Incorrect refresh_token')

        return auth_service.generate_tokens(data={'sub': user_id})
