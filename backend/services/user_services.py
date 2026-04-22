import datetime
from typing import Annotated

import jwt
from fastapi import HTTPException, status, Response
from jwt import ExpiredSignatureError, InvalidTokenError, DecodeError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from core.config import settings
from models.sql_models import User
from schemas.user import UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:

    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: UserCreate) -> User:
        existing_user = self.db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Username already registered'
            )

        user_data.password = self.hash_password(user_data.password)
        db_user = User(**user_data.model_dump())
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def get_user(self, user_id: int) -> type[User]:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )

        return user

    def get_user_by_username(self, username: str) -> type[User]:
        user = self.db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        return user

    @staticmethod
    def hash_password(raw_password: str) -> str:
        return pwd_context.hash(raw_password)


class AuthenticationService:

    def __init__(self, db: Session):
        self.db = db

    def authenticate_user(self, username: str, password: str) -> Annotated[type[User] | bool, None]:
        user = self.db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        if not self.check_password(password, str(user.password)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Incorrect Password'
            )
        return user

    def generate_tokens(self, data: dict) -> dict:
        """ Generate access and refresh token based on username """
        to_encode = data.copy()

        access_token_expire = self.get_exp(settings.ACCESS_TOKEN_EXPIRE)
        refresh_token_expire = self.get_exp(settings.REFRESH_TOKEN_EXPIRE)

        access_token = self.generate_token(to_encode, access_token_expire)
        refresh_token = self.generate_token(to_encode, refresh_token_expire)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "access_token_expire": access_token_expire,
            "refresh_token_expire": refresh_token_expire,
        }

    def set_cookie_tokens(
            self, data: dict, response: Response | None = None
    ) -> Response:
        tokens: dict = self.generate_tokens(data)
        if not response:
            response = Response(status_code=200)
        response = self.set_access_token(
            tokens.get('access_token'), tokens.get('access_token_expire'), response
        )
        response = self.set_refresh_token(
            tokens.get('refresh_token'), tokens.get('refresh_token_expire'), response
        )
        return response

    @staticmethod
    def check_password(password: str, hashed_password: str) -> bool:
        return pwd_context.verify(password, hashed_password)

    @staticmethod
    def get_exp(timedelta: datetime.timedelta) -> datetime.datetime:
        return (
                datetime.datetime.now(datetime.timezone.utc) + timedelta
        )

    @staticmethod
    def validate_refresh_token(token: str) -> str | None:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            username: str | None = payload.get('sub')
            if not username:
                return None
            return username
        except (ExpiredSignatureError, InvalidTokenError, DecodeError):
            return None

    @staticmethod
    def set_access_token(
            access_token: str, expire: datetime.datetime, response: Response
    ) -> Response:
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            secure=False,
            expires=expire
        )
        return response

    @staticmethod
    def set_refresh_token(
            refresh_token: str, expire: datetime.datetime, response: Response
    ) -> Response:
        """ Set refresh token based on username """
        response.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            secure=False,
            expires=expire,
        )
        return response

    @staticmethod
    def generate_token(to_encode: dict, expire: datetime.datetime) -> str:
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

    @staticmethod
    def logout_user(response: Response | None = None) -> Response:
        """ Logout user """
        if not response:
            response = Response(status_code=204)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response
