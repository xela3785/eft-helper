import asyncio
import logging
from typing import Dict, List, Tuple, Any, Optional

from core.eft_cache import MarketCache

logger = logging.getLogger(__name__)


class ItemIndexes:

    def __init__(self):
        self._items: List[Dict[str, Any]] = []
        self._indexes: Dict[str, List[Tuple[str, int]]] = {}  # sort_key -> [(id, value), ...]
        self._filters_cache: Dict[str, set] = {}
        self._lock = asyncio.Lock()

    async def build_indexes(self):
        data = await MarketCache().get_data()
        async with self._lock:
            self._items = data.get('data', {}).get('items', [])

            items_for_indexing = []
            for item in self._items:
                # avgPrice
                avg_24_price = item.get('avg24hPrice', None)
                if not avg_24_price:
                    avg_24_price = 0

                # MaxTraderSellFor
                prices = [
                    sell_for.get('price', 0) for sell_for in item.get('sellFor', [])
                    if sell_for.get('vendor').get('name') != 'Барахолка'
                ]
                trader_sell_max = max(prices) if prices else 0

                items_for_indexing.append((item.get('id'), avg_24_price, trader_sell_max))

            self._indexes['id'] = sorted(
                items_for_indexing,
                key=lambda x: x[0],
                reverse=True
            )

            self._indexes['24_price_desc'] = sorted(
                items_for_indexing,
                key=lambda x: x[1],
                reverse=True
            )

            self._indexes['24_price_asc'] = sorted(
                items_for_indexing,
                key=lambda x: x[1] > 0,
            )

            self._indexes['trader_sell_desc'] = sorted(
                items_for_indexing,
                key=lambda x: x[2],
                reverse=True
            )

            self._indexes['trader_sell_asc'] = sorted(
                items_for_indexing,
                key=lambda x: x[2],
            )

            logger.info(f'Built indexes for: {len(self._indexes["id"])} items')

    async def reindex(self):
        async with self._lock:
            self._filters_cache.clear()
            await self.build_indexes()

    def _filter_ids(
            self,
            search: Optional[str] = None,
    ) -> set:
        all_ids = set([item.get('id') for item in self._items])

        if search:
            search_lower = search.lower()
            filtered = {
                item.get('id') for item in self._items
                if search_lower in item.get('name', '').lower() or
                   search_lower in item.get('shortName', '').lower()
            }
            all_ids &= filtered

        return all_ids

    def get_paginated_ids(
            self,
            sort_by: str = 'id',
            cursor_id: Optional[str] = None,
            limit: int = 50,
            search: Optional[str] = None,
    ) -> None | list[Any] | list[str]:

        filtered_ids = self._filter_ids(search)
        if sort_by not in self._indexes:
            return []

        sorted_list = [
            (item_id, avg_24_price, _) for item_id, avg_24_price, _ in self._indexes[sort_by]
            if item_id in filtered_ids
        ]

        if not sorted_list:
            return []

        start_idx = 0
        if cursor_id:
            found_idx = next(
                (i for i, (id_, _, _) in enumerate(sorted_list) if id_ == cursor_id),
                None
            )
            start_idx = found_idx + 1 if found_idx is not None else len(sorted_list)

        result_ids = [item[0] for item in sorted_list[start_idx: start_idx + limit]]
        return result_ids

    def get_next_cursor(
            self,
            sort_by: str,
            current_id: str,
            search: Optional[str] = None,
    ) -> Optional[str]:
        ids = self.get_paginated_ids(
            sort_by=sort_by,
            cursor_id=current_id,
            limit=1,
            search=search,
        )
        return ids[0] if ids else None


item_indexes = ItemIndexes()
