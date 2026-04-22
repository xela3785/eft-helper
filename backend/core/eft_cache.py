import json
import logging
from pathlib import Path
from threading import RLock
from typing import Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)


class TarkovDataCache:
    _instance: Optional['TarkovDataCache'] = None
    _lock: RLock = RLock()
    _fallback_data: Dict[str, Any] = {'data': {'hideoutStations': []}}

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._data: Dict[str, Any] = {}
        self._cache_file = Path(__file__).parent.parent / 'data' / 'eft_data.json'
        self._data_lock = RLock()

        self._load_from_file()

    def _load_from_file(self) -> bool:
        if not self._cache_file.exists():
            logger.warning(f'Cache file not found at {self._cache_file}. Initializing with empty data.')
            self._data = self._fallback_data
            return False
        try:
            with open(self._cache_file, 'r', encoding='utf-8') as f:
                loaded_data = json.load(f)
                with self._data_lock:
                    self._data = loaded_data
                logger.info(f'Cache loaded successfully')
                return True
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f'Failed to load or parse cache file: {e}')
            self._data = self._fallback_data
            return False

    def get_data(self) -> Dict[str, Any]:
        with self._data_lock:
            return json.loads(json.dumps(self._data))

    def update_from_api(self) -> bool:
        query = """
            {
                hideoutStations(lang: ru) {
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
        headers = {'Content-Type': 'application/json'}
        try:
            response = httpx.post('https://api.tarkov.dev/graphql', headers=headers, json={'query': query})
            api_data = response.json()

            if 'errors' in api_data:
                logger.error(f'GraphQL API returned errors: {api_data["errors"]}')
                return False

            with open(self._cache_file, 'w', encoding='utf-8') as f:
                json.dump(api_data, f, ensure_ascii=False, indent=2)

            with self._data_lock:
                self._data = api_data

            logger.info('Cache updated successfully from GraphQL API')
            return True

        except Exception as e:
            logger.exception('An error occurred while updating cache from GraphQL API')
            return False

    def reload_from_file(self) -> bool:
        return self._load_from_file()


cache = TarkovDataCache()


def get_game_data() -> Dict[str, Any]:
    return cache.get_data()


def update_cache_from_api() -> bool:
    return cache.update_from_api()


def reload_cache() -> bool:
    return cache.reload_from_file()
