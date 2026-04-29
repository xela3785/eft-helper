from typing import Optional

from fastapi import APIRouter, Query

from core.eft_cache import MarketCache
from core.indexes import item_indexes
from schemas.market import PaginatedMarketData

router = APIRouter()


@router.get('/prices')
async def get_prices(
        sort_by: str = Query(default='id'),
        limit: int = Query(default=50, ge=1, le=100),
        cursor: Optional[str] = None
):
    ids_page = item_indexes.get_paginated_ids(
        sort_by=sort_by,
        cursor_id=cursor,
        limit=limit,
    )

    if not ids_page:
        return PaginatedMarketData(
            items=[],
            next_cursor=None,
            has_more=False,
        )

    items_data: list = []
    for item_id in ids_page:
        meta = await MarketCache().get_item(item_id)
        items_data.append({
            'id': item_id,
            'meta': meta,
        })

    last_id = ids_page[-1]
    next_cursor = item_indexes.get_next_cursor(
        sort_by=sort_by,
        current_id=last_id,
    )

    return PaginatedMarketData(
        items=items_data,
        next_cursor=next_cursor,
        has_more=bool(next_cursor)
    )
