import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from api.v1 import hideout, user, market
from core.eft_cache import ModulesCache, MarketCache
from core.price_sync import refresh_prices_task
from middleware.jwt_middleware import JWTTokenRefreshMiddleware

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    modules_cache_data = await ModulesCache().get_data()

    if not modules_cache_data.get('data', {}).get('hideoutStations', []):
        await ModulesCache().update_from_api()

    asyncio.create_task(refresh_prices_task())
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Or use ["*"] for development ONLY
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

app.add_middleware(JWTTokenRefreshMiddleware)

app.include_router(user.router, prefix='/api/v1/auth', tags=['auth'])
app.include_router(hideout.router, prefix='/api/v1/hideout', tags=['hideout'])
app.include_router(market.router, prefix='/api/v1/market', tags=['market'])


@app.get('/debug/modules_cache')
async def test_modules_cache():
    data = await ModulesCache().get_data()
    return data.get('data')


@app.get('/debug/market_cache')
async def test_market_cache():
    data = await MarketCache().get_data()
    items = data.get('data', {}).get('items', [])
    return len(items)
