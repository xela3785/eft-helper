export interface MarketVendor {
  name: string;
}

export interface MarketPricePoint {
  price: number;
  currency: string;
  vendor: MarketVendor;
}

export interface MarketItemMeta {
  id: string;
  name: string;
  wikiLink?: string;
  image512pxLink?: string;
  avg24hPrice?: number;
  updated?: string;
  buyFor: MarketPricePoint[];
  sellFor: MarketPricePoint[];
}

export interface MarketItem {
  id: string;
  meta: MarketItemMeta;
}

export interface MarketPricesResponse {
  items: MarketItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export type MarketSortValue =
  | '24_price_desc'
  | '24_price_asc'
  | 'trader_sell_desc'
  | 'trader_sell_asc';
