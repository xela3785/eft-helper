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
                avg_24_price = item.get('avg24hPrice')

                # MaxTraderSellFor
                trader_sell_max = (
                    item.get('maxSellFor', {}).get('price', None)
                    if item.get('maxSellFor') else None
                )

                # MinTraderBuyFor
                trader_buy_min = (
                    item.get('minBuyFor', {}).get('price', None)
                    if item.get('minBuyFor') else None
                )

                # sellToTraderFromMarket
                sell_trader_from_market = item.get('sellToTraderFromMarket', None)

                # sellToMarketFromTrader
                sell_market_from_trader = item.get('sellToMarketFromTrader', None)

                items_for_indexing.append((
                    item.get('id'),
                    avg_24_price,
                    trader_sell_max,
                    trader_buy_min,
                    sell_trader_from_market,
                    sell_market_from_trader,
                ))

            self._indexes['default'] = sorted(
                items_for_indexing,
            )

            self._indexes['id'] = sorted(
                items_for_indexing,
                key=lambda x: x[0],
                reverse=True
            )

            def sort_none_last(value_idx: int, reverse: bool = False) -> List[Tuple[str, Any, Any, Any, Any, Any]]:
                with_value = [x for x in items_for_indexing if x[value_idx] is not None]
                without_value = [x for x in items_for_indexing if x[value_idx] is None]
                with_value.sort(key=lambda x: x[value_idx], reverse=reverse)
                return with_value + without_value

            sortable_fields = (
                ('24_price', 1),
                ('trader_sell', 2),
                ('trader_buy', 3),
                ('sell_trader_from_market', 4),
                ('sell_market_from_trader', 5),
            )

            for field_name, value_idx in sortable_fields:
                self._indexes[f'{field_name}_desc'] = sort_none_last(value_idx=value_idx, reverse=True)
                self._indexes[f'{field_name}_asc'] = sort_none_last(value_idx=value_idx, reverse=False)

            logger.info(f'Built indexes for: {len(self._indexes["id"])} items')

    async def reindex(self):
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
            sort_by: str = 'default',
            cursor_id: Optional[str] = None,
            limit: int = 50,
            search: Optional[str] = None,
    ) -> None | list[Any] | list[str]:

        filtered_ids = self._filter_ids(search)
        if sort_by not in self._indexes:
            return []

        sorted_list = [
            (item_id, avg_24_price, *_,) for item_id, avg_24_price, *_, in self._indexes[sort_by]
            if item_id in filtered_ids
        ]

        if not sorted_list:
            return []

        start_idx = 0
        if cursor_id:
            found_idx = next(
                (i for i, (id_, *_) in enumerate(sorted_list) if id_ == cursor_id),
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
