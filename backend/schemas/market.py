from typing import Optional

from pydantic import BaseModel


class PriceFilterRequest(BaseModel):
    search: Optional[str] = None


class PaginatedMarketData(BaseModel):
    items: list
    next_cursor: Optional[str]
    has_more: bool
