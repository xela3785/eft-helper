import os
import sys
from pathlib import Path
from typing import Any, AsyncGenerator

import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault("SQLALCHEMY_DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("SQLALCHEMY_DATABASE_SYNC_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-at-least-32-bytes")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.database import Base
from core.database import get_db
from api.v1 import hideout, market, user
from middleware.jwt_middleware import JWTTokenRefreshMiddleware


@pytest_asyncio.fixture
async def db_session(tmp_path) -> AsyncGenerator[AsyncSession, Any]:
    db_file = tmp_path / "test.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_app(db_session: AsyncSession) -> AsyncGenerator[FastAPI, Any]:
    app = FastAPI()
    app.add_middleware(JWTTokenRefreshMiddleware)
    app.include_router(user.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(hideout.router, prefix="/api/v1/hideout", tags=["hideout"])
    app.include_router(market.router, prefix="/api/v1/market", tags=["market"])

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def api_client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, Any]:
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
