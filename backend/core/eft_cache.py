import asyncio
import copy
import json
import logging
import os
import tempfile
from abc import ABC, ABCMeta
from pathlib import Path
from threading import Lock
from typing import Optional, Dict, Any

import cachetools

from core.exceptions import GraphQLResponseError, APIUnavailableError, CacheWriteError
from core.tarkov_dev_client import TarkovDevAPIClient

logger = logging.getLogger(__name__)


class SingletonABCMeta(ABCMeta):
    _instances = {}
    _locks = {}

    def __call__(cls, *args, **kwargs):
        if cls in cls._instances:
            return cls._instances[cls]

        lock = cls._locks.setdefault(cls, Lock())
        with lock:
            if cls not in cls._instances:
                cls._instances[cls] = super().__call__(*args, **kwargs)
            return cls._instances[cls]


class AbstractCache(ABC, metaclass=SingletonABCMeta):
    _default_data: Dict[str, Any] = {}
    _cache_file: Optional[Path] = None
    _query: Optional[str] = None
    _cache_maxsize: int = 128

    def __init__(self):
        self._lock = asyncio.Lock()
        self._initialized = False

        assert self._default_data is not None, (
                "'%s' should either include a `_default_data` attribute, "
                "or override the `__init__()` method."
                % self.__class__.__name__
        )
        assert self._cache_file is not None, (
                "'%s' should either include a `_cache_file` attribute, "
                "or override the `__init__()` method."
                % self.__class__.__name__
        )
        assert self._cache_maxsize > 0, (
                "'%s' should either include a positive `_cache_maxsize` attribute, "
                "or override the `__init__()` method."
                % self.__class__.__name__
        )

        self._data: Dict[str, Any] = copy.deepcopy(self._default_data)
        self._cache: cachetools.LRUCache = cachetools.LRUCache(maxsize=self._cache_maxsize)

    def _reset_to_default_locked(self):
        if not self._lock.locked():
            raise RuntimeError('Must be called under lock')
        self._data = copy.deepcopy(self._default_data)
        self._cache.clear()

    async def initialize(self):
        if self._initialized:
            return
        async with self._lock:
            if self._initialized:
                return
            await self._load_from_file_locked()
            self._initialized = True

    async def _ensure_initialized(self):
        if not self._initialized:
            await self.initialize()

    async def _load_from_file_locked(self) -> None:
        if not self._lock.locked():
            raise RuntimeError('Must be called under lock')

        if not self._cache_file.exists():  # checks with assert
            logger.warning(
                f'Cache file not found, using default data in class: {self.__class__.__name__}'
            )
            self._reset_to_default_locked()
            return

        try:
            content = await asyncio.to_thread(
                self._cache_file.read_text, encoding='utf-8'
            )
            loaded_data = json.loads(content)
            if not isinstance(loaded_data, dict):
                logger.error(
                    f'Invalid cache file format in class: {self.__class__.__name__}'
                )
                self._reset_to_default_locked()
                return
            self._data = loaded_data
            self._cache.clear()
        except json.JSONDecodeError:
            logger.exception(
                f'Cache file contains invalid JSON in class: {self.__class__.__name__}'
            )
            self._reset_to_default_locked()
        except Exception as e:
            logger.exception(
                f'Exception was raised while loading data from file in class: {self.__class__.__name__}.'
                f'Original exception: {e}'
            )
            self._reset_to_default_locked()

    async def get_data(self) -> Dict[str, Any]:
        await self._ensure_initialized()
        async with self._lock:
            return copy.deepcopy(self._data)

    async def _request_api_data(self):
        assert self._query is not None, (
                "'%s' should either include a `_query` attribute, "
                "or override the `_request_api_data()` method."
                % self.__class__.__name__
        )
        eft_client = TarkovDevAPIClient()
        return await eft_client.request(
            query=self._query
        )

    @staticmethod
    def _write_file_atomically(file_path: Path, payload: str) -> None:
        fd, temp_path = tempfile.mkstemp(
            prefix=f'.{file_path.name}.',
            suffix='.tmp',
            dir=str(file_path.parent),
        )
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as tmp_file:
                tmp_file.write(payload)
                tmp_file.flush()
                os.fsync(tmp_file.fileno())
            os.rename(temp_path, file_path)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    async def update_from_api(self, raise_exceptions=False) -> bool:
        api_data = await self._request_api_data()
        if not api_data:
            if raise_exceptions:
                raise APIUnavailableError('Failed to update from API')
            return False

        if 'errors' in api_data:
            logger.error(
                f'GraphQL errors in class {self.__class__.__name__}: {api_data["errors"]}'
            )
            if raise_exceptions:
                raise GraphQLResponseError(api_data["errors"])
            return False

        try:
            transformed = await self._transform_before_save(api_data)
            self._cache_file.parent.mkdir(parents=True, exist_ok=True)
            payload = json.dumps(transformed, ensure_ascii=False, indent=2)
            await asyncio.to_thread(self._write_file_atomically, self._cache_file, payload)

            async with self._lock:
                self._data = transformed
                self._cache.clear()
                self._initialized = True

            logger.info(
                f'Cache updated from API in class: {self.__class__.__name__}'
            )
            return True
        except Exception as e:
            logger.exception(
                f'Exception was raised while updating from API in class: {self.__class__.__name__}.'
                f'Original exception: {e}'
            )
            if raise_exceptions:
                raise CacheWriteError('Failed to write cache') from e
            return False

    @staticmethod
    async def _transform_before_save(api_data: Dict[str, Any]) -> Dict[str, Any]:
        return api_data


class ModulesCache(AbstractCache):
    _default_data: Dict[str, Any] = {'data': {'hideoutStations': []}}
    _cache_file = Path(__file__).parent.parent / 'data' / 'eft_data.json'
    _cache_maxsize: int = 128
    _query = """
        {
            hideoutStations(lang: ru, gameMode: regular) {
                id
                name
                normalizedName
                imageLink
                levels {
                    id
                    level
                    description
                    constructionTime
                    itemRequirements {
                        id
                        item {
                            id
                            shortName
                            name
                            link
                            wikiLink
                            image512pxLink
                            gridImageLink
                            iconLink
                            image8xLink
                            backgroundColor
                            __typename
                        }
                        count
                        quantity
                        attributes {
                            name
                            value
                        }
                        __typename
                    }
                    stationLevelRequirements {
                        id
                        station {
                            id
                            name
                            __typename
                        }
                        level
                        __typename
                    }
                    skillRequirements {
                        id
                        name
                        level
                        __typename
                    }
                    traderRequirements {
                        id
                        trader {
                            id
                            name
                            __typename
                        }
                        level
                        __typename
                    }
                    crafts {
                        id
                        duration
                        requiredItems {
                            item {
                                id
                                shortName
                                name
                                link
                                wikiLink
                                image512pxLink
                                gridImageLink
                                iconLink
                                image8xLink
                                backgroundColor
                                __typename
                            }
                            count
                            quantity
                            __typename
                        }
                        rewardItems {
                            item {
                                id
                                shortName
                                name
                                link
                                wikiLink
                                image512pxLink
                                gridImageLink
                                iconLink
                                image8xLink
                                backgroundColor
                                __typename
                            }
                            count
                            quantity
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
            }
        }
    """

    async def get_module(self, module_id: str) -> Optional[Dict[str, Any]]:
        await self._ensure_initialized()
        cached = self._cache.get(module_id)
        if cached:
            return copy.deepcopy(cached)

        async with self._lock:
            modules = self._data.get('data', {}).get('hideoutStations', [])
            if not isinstance(modules, list):
                return None
            module = next((m for m in modules if m['id'] == module_id), None)
            if module is not None:
                self._cache[module_id] = module
                return copy.deepcopy(module)

        return None


class MarketCache(AbstractCache):
    _default_data: Dict[str, Any] = {"data": {"items": []}}
    _cache_file = Path(__file__).parent.parent / "data" / "market_data.json"
    _cache_maxsize = 10_000
    _query = """
        {
            items(lang: ru, gameMode: regular) {
                id
                name
                avg24hPrice
                changeLast48h
                changeLast48hPercent
                wikiLink
                image512pxLink
                sellFor {
                    price
                    currency
                    vendor {
                        name
                    }
                }
                updated
                buyFor {
                    price
                    currency
                    vendor {
                        name
                    }
                }
            }
        }
    """

    async def get_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        await self._ensure_initialized()
        cached = self._cache.get(item_id)
        if cached:
            return copy.deepcopy(cached)

        async with self._lock:
            items = self._data.get("data", {}).get("items", [])
            if not isinstance(items, list):
                return None
            item = next((m for m in items if m.get("id") == item_id), None)
            if item is not None:
                self._cache[item_id] = item
                return copy.deepcopy(item)
        return None

    @staticmethod
    async def _transform_before_save(api_data: Dict[str, Any]) -> Dict[str, Any]:
        items = api_data.get("data", {}).get("items", [])

        transformed_data = []
        for item in items:
            transformed_item = item
            # avg24Price
            transformed_item['avg24hPrice'] = item.get('avg24hPrice', 0)

            # Max sell for
            sell_prices = item.get('sellFor', [])
            sell_to_trader = [p for p in sell_prices if p.get('vendor', {}).get('name') != 'Барахолка']
            max_price = max(
                sell_to_trader,
                key=lambda x: x.get('price', 0),
                default=None
            ) if sell_to_trader else None
            transformed_item['maxSellFor'] = max_price

            # Min buy for
            buy_prices = item.get('buyFor', [])
            buy_from_trader = [p for p in buy_prices if p.get('vendor', {}).get('name') != 'Барахолка']
            min_price = min(
                buy_from_trader,
                key=lambda x: x.get('price', 0),
                default=None
            ) if buy_from_trader else None
            transformed_item['minBuyFor'] = min_price

            # Buy from market sell to trader
            buy_from_market = next(
                (obj for obj in buy_prices if obj.get('vendor', {}).get('name') == 'Барахолка'),
                None
            )
            sell_to_market = next(
                (obj for obj in sell_prices if obj.get('vendor', {}).get('name') == 'Барахолка'),
                None
            )

            transformed_item['sellToTraderFromMarket'] = (
                (max_price.get('price', 0) - buy_from_market.get('price', 0))
                if max_price and buy_from_market else None
            )
            transformed_item['sellToMarketFromTrader'] = (
                (sell_to_market.get('price', 0) - min_price.get('price', 0))
                if min_price and sell_to_market else None
            )

            transformed_data.append(transformed_item)

        return {
            'data': {'items': transformed_data},
        }
