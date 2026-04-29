export const marketQueryKeys = {
  prices: (params: { search: string; sortBy: string }) => ['market', 'prices', params] as const,
};
