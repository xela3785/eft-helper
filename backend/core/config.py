import os
from datetime import timedelta

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = 'EFT-Helper'
    SQLALCHEMY_DATABASE_URL: str = os.getenv('SQLALCHEMY_DATABASE_URL')
    SQLALCHEMY_DATABASE_SYNC_URL: str = os.getenv('SQLALCHEMY_DATABASE_SYNC_URL')
    DB_ECHO: bool = False  # logging SQL

    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE: timedelta = timedelta(minutes=1)
    REFRESH_TOKEN_EXPIRE: timedelta = timedelta(days=7)

    # Google Oauth2
    GOOGLE_CLIENT_ID: str | None = os.getenv("GOOGLE_CLIENT_ID", None)
    GOOGLE_CLIENT_SECRET: str | None = os.getenv("GOOGLE_CLIENT_SECRET", None)
    GOOGLE_REDIRECT_URL: str | None = os.getenv("GOOGLE_REDIRECT_URL", None)

    # Github Oauth2
    GITHUB_CLIENT_ID: str | None = os.getenv("GITHUB_CLIENT_ID", None)
    GITHUB_CLIENT_SECRET: str | None = os.getenv("GITHUB_CLIENT_SECRET", None)
    GITHUB_REDIRECT_URL: str | None = os.getenv("GITHUB_REDIRECT_URL", None)

    class Config:
        env_file = '.env'


settings = Settings()
