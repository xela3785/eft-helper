import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from api.v1 import hideout, user
from core.database import engine
from core.eft_cache import get_game_data, update_cache_from_api
from middleware.jwt_middleware import JWTTokenRefreshMiddleware
from models.sql_models import Base

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    data = get_game_data()
    if not data.get('data', {}).get('hideoutStations', []):
        update_cache_from_api()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",  # Default Vite port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Or use ["*"] for development ONLY
    allow_credentials=True,
    allow_methods=["*"],         # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],         # Allows all headers
)

app.add_middleware(JWTTokenRefreshMiddleware)

app.include_router(user.router, prefix='/api/v1/auth', tags=['auth'])
app.include_router(hideout.router, prefix='/api/v1/hideout', tags=['hideout'])


@app.get('/debug/cache')
async def test_cache():
    data = get_game_data()
    return data.get('data')
