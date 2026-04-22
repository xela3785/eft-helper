import os
from datetime import timedelta

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = 'EFT-Helper'
    SQLALCHEMY_DATABASE_URL: str = os.getenv('SQLALCHEMY_DATABASE_URL')
    DB_ECHO: bool = False  # logging SQL

    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE: timedelta = timedelta(minutes=1)
    REFRESH_TOKEN_EXPIRE: timedelta = timedelta(days=7)

    class Config:
        env_file = '.env'


settings = Settings()
