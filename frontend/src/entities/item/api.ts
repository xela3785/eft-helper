import { apiClient } from '../../shared/api/client';
import type { MarketPricesResponse, MarketSortValue } from './types';

interface GetMarketPricesParams {
  cursor?: string;
  search?: string;
  sortBy?: MarketSortValue;
}

export async function getMarketPrices(params: GetMarketPricesParams = {}) {
  const { cursor, search, sortBy } = params;

  const { data } = await apiClient.get<MarketPricesResponse>('/market/prices', {
    params: {
      cursor,
      search,
      sort_by: sortBy,
    },
  });

  return data;
}
