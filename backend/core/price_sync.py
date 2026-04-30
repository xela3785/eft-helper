import asyncio
import logging

from core.config import settings
from core.eft_cache import MarketCache
from core.indexes import item_indexes

logger = logging.getLogger(__name__)


async def refresh_prices_task():
    while True:
        try:
            logger.info(
                'Starting refresh prices task...'
            )
            market_cache = MarketCache()
            await market_cache.update_from_api(raise_exceptions=True)
            await item_indexes.reindex()
        except Exception as e:
            wait = min(300, 15 * 60) if 'rate limit' in str(e).lower() else 300
            logger.error(f'Price sync failed: {e}. Waiting {wait} seconds...')
            await asyncio.sleep(wait)
        await asyncio.sleep(settings.MARKET_SYNC_INTERVAL_SECONDS)
