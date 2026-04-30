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
  maxSellFor?: MarketPricePoint;
  minBuyFor?: MarketPricePoint;
  sellToTraderFromMarket?: number;
  sellToMarketFromTrader?: number;
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
  | 'default'
  | 'id'
  | '24_price_desc'
  | '24_price_asc'
  | 'trader_sell_desc'
  | 'trader_sell_asc'
  | 'trader_buy_desc'
  | 'trader_buy_asc'
  | 'sell_trader_from_market_desc'
  | 'sell_trader_from_market_asc'
  | 'sell_market_from_trader_desc'
  | 'sell_market_from_trader_asc';
