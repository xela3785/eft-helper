import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getMarketPrices } from '../entities/item/api';
import type { MarketItemMeta, MarketPricePoint, MarketSortValue } from '../entities/item/types';
import { marketQueryKeys } from '../features/market/model/query-keys';
import { PageShell } from '../shared/ui/PageShell';

const fleaMarketVendorName = 'Барахолка';

const sortOptions: Array<{ value: MarketSortValue; label: string }> = [
  { value: 'default', label: 'По умолчанию' },
  { value: 'id', label: 'ID предмета' },
  { value: '24_price_desc', label: 'Цена за 24ч (по убыванию)' },
  { value: '24_price_asc', label: 'Цена за 24ч (по возрастанию)' },
  { value: 'trader_sell_desc', label: 'Цена продажи торговцу (по убыванию)' },
  { value: 'trader_sell_asc', label: 'Цена продажи торговцу (по возрастанию)' },
  { value: 'trader_buy_desc', label: 'Покупка у торговца (по убыванию)' },
  { value: 'trader_buy_asc', label: 'Покупка у торговца (по возрастанию)' },
  { value: 'sell_trader_from_market_desc', label: 'Барахолка → торговец (по убыванию)' },
  { value: 'sell_trader_from_market_asc', label: 'Барахолка → торговец (по возрастанию)' },
  { value: 'sell_market_from_trader_desc', label: 'Барахолка → барахолка (по убыванию)' },
  { value: 'sell_market_from_trader_asc', label: 'Барахолка → барахолка (по возрастанию)' },
];

type SortableColumnKey =
  | 'name'
  | 'avg24hPrice'
  | 'traderSell'
  | 'traderBuy'
  | 'sellToTraderFromMarket'
  | 'sellToMarketFromTrader';

type ColumnSortConfig =
  | { mode: 'single'; value: MarketSortValue }
  | { mode: 'range'; desc: MarketSortValue; asc: MarketSortValue };

const sortableColumnConfig: Record<SortableColumnKey, ColumnSortConfig> = {
  name: { mode: 'single', value: 'id' },
  avg24hPrice: { mode: 'range', desc: '24_price_desc', asc: '24_price_asc' },
  traderSell: { mode: 'range', desc: 'trader_sell_desc', asc: 'trader_sell_asc' },
  traderBuy: { mode: 'range', desc: 'trader_buy_desc', asc: 'trader_buy_asc' },
  sellToTraderFromMarket: {
    mode: 'range',
    desc: 'sell_trader_from_market_desc',
    asc: 'sell_trader_from_market_asc',
  },
  sellToMarketFromTrader: {
    mode: 'range',
    desc: 'sell_market_from_trader_desc',
    asc: 'sell_market_from_trader_asc',
  },
};

function formatPrice(price?: number) {
  if (price === undefined) {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU').format(price);
}

function formatPricePoint(point?: MarketPricePoint) {
  if (!point) {
    return '—';
  }

  return `${formatPrice(point.price)} ${point.currency} · ${point.vendor.name}`;
}

function getMarketPrice(points: MarketPricePoint[]) {
  return points
    .filter((point) => point.vendor.name === fleaMarketVendorName)
    .reduce<number | undefined>(
      (acc, point) => (acc === undefined ? point.price : Math.min(acc, point.price)),
      undefined,
    );
}

function getBestTraderSellPricePoint(points: MarketPricePoint[]) {
  // TODO: Если сервер начнет возвращать агрегированную цену продажи торговцу, брать значение напрямую из API.
  return points
    .filter((point) => point.vendor.name !== fleaMarketVendorName)
    .reduce<MarketPricePoint | undefined>(
      (acc, point) => (acc === undefined || point.price > acc.price ? point : acc),
      undefined,
    );
}

function getBestTraderBuyPricePoint(points: MarketPricePoint[]) {
  // TODO: Если сервер начнет возвращать агрегированную цену покупки у торговца, брать значение напрямую из API.
  return points
    .filter((point) => point.vendor.name !== fleaMarketVendorName)
    .reduce<MarketPricePoint | undefined>(
      (acc, point) => (acc === undefined || point.price < acc.price ? point : acc),
      undefined,
    );
}

function getFleaToTraderValue(meta: MarketItemMeta) {
  // TODO: Если сервер начнет возвращать готовую метрику, брать ее напрямую из API.
  const fleaBuyPrice = getMarketPrice(meta.buyFor);
  const traderSellPrice = getBestTraderSellPricePoint(meta.sellFor)?.price;

  if (fleaBuyPrice === undefined || traderSellPrice === undefined) {
    return undefined;
  }

  return fleaBuyPrice - traderSellPrice;
}

function getTraderToFleaValue(meta: MarketItemMeta) {
  // TODO: Если сервер начнет возвращать готовую метрику, брать ее напрямую из API.
  const traderBuyPrice = getBestTraderBuyPricePoint(meta.buyFor)?.price;
  const fleaSellPrice = getMarketPrice(meta.sellFor);

  if (traderBuyPrice === undefined || fleaSellPrice === undefined) {
    return undefined;
  }

  return traderBuyPrice - fleaSellPrice;
}

function SkeletonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80">
      <div className="hidden grid-cols-[96px_minmax(240px,1fr)_140px_140px_160px_160px_170px_170px] gap-3 border-b border-slate-800 bg-slate-900/70 px-4 py-3 text-xs uppercase tracking-wider text-slate-400 lg:grid">
        <span>Изображение</span>
        <span>Название</span>
        <span>Wiki</span>
        <span>Цена 24ч</span>
        <span>Продажа торговцу</span>
        <span>Покупка у торговца</span>
        <span>Барахолка → торговец</span>
        <span>Торговец → барахолка</span>
      </div>
      <div className="divide-y divide-slate-800">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            className="grid animate-pulse grid-cols-1 gap-4 bg-slate-950/60 px-4 py-4 lg:grid-cols-[96px_minmax(240px,1fr)_140px_140px_160px_160px_170px_170px]"
            key={index}
          >
            <div className="h-20 w-20 rounded-xl bg-slate-800" />
            <div className="h-6 w-4/5 rounded bg-slate-800" />
            <div className="h-6 w-20 rounded bg-slate-800" />
            <div className="h-6 w-24 rounded bg-slate-800" />
            <div className="h-6 w-28 rounded bg-slate-800" />
            <div className="h-6 w-28 rounded bg-slate-800" />
            <div className="h-6 w-36 rounded bg-slate-800" />
            <div className="h-6 w-36 rounded bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<MarketSortValue>('default');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const marketQuery = useInfiniteQuery({
    queryKey: marketQueryKeys.prices({ search, sortBy }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getMarketPrices({
        cursor: pageParam,
        search: search || undefined,
        sortBy,
      }),
    getNextPageParam: (lastPage) => (lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined),
  });

  useEffect(() => {
    if (!marketQuery.isError) {
      return;
    }

    toast.error('Не удалось загрузить данные маркета. Проверьте подключение к сети и попробуйте снова.');
  }, [marketQuery.isError]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !marketQuery.hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || marketQuery.isFetchingNextPage) {
          return;
        }

        void marketQuery.fetchNextPage();
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [marketQuery]);

  const items = useMemo(
    () => marketQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [marketQuery.data?.pages],
  );

  const getSortIndicator = (column: SortableColumnKey) => {
    const config = sortableColumnConfig[column];

    if (config.mode === 'single') {
      return sortBy === config.value ? '↓' : '';
    }

    if (sortBy === config.desc) {
      return '↓';
    }

    if (sortBy === config.asc) {
      return '↑';
    }

    return '';
  };

  const handleColumnSort = (column: SortableColumnKey) => {
    const config = sortableColumnConfig[column];

    setSortBy((prevSort) => {
      if (config.mode === 'single') {
        return prevSort === config.value ? 'default' : config.value;
      }

      if (prevSort === config.desc) {
        return config.asc;
      }

      if (prevSort === config.asc) {
        return 'default';
      }

      return config.desc;
    });
  };

  return (
    <PageShell
      eyebrow="Аналитика барахолки"
      title="Маркет"
      description="Сравнивайте цены барахолки и торговцев, сортируйте список и загружайте предметы по мере прокрутки."
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Поиск</span>
          <input
            className="h-11 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Введите название предмета"
            type="search"
            value={searchInput}
          />
        </label>

        <label className="flex w-full flex-col gap-2 sm:w-80">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Сортировка</span>
          <select
            className="h-11 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            onChange={(event) => setSortBy(event.target.value as MarketSortValue)}
            value={sortBy}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {marketQuery.isPending ? <SkeletonTable /> : null}

        {!marketQuery.isPending && items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-10 text-center text-slate-300">
            По текущим фильтрам ничего не найдено.
          </div>
        ) : null}

        {!marketQuery.isPending && items.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="min-w-[1200px] table-fixed divide-y divide-slate-800 text-left">
              <thead className="bg-slate-900/80">
                <tr className="text-xs uppercase tracking-wider text-slate-400">
                  <th className="w-24 px-4 py-3">Изображение</th>
                  <th className="px-4 py-3">
                    <button
                      className="cursor-pointer text-left transition hover:text-violet-300"
                      onClick={() => handleColumnSort('name')}
                      type="button"
                    >
                      Название {getSortIndicator('name')}
                    </button>
                  </th>
                  <th className="w-32 px-4 py-3">Wiki</th>
                  <th className="w-36 px-4 py-3">
                    <button
                      className="cursor-pointer text-left transition hover:text-violet-300"
                      onClick={() => handleColumnSort('avg24hPrice')}
                      type="button"
                    >
                      Цена 24ч {getSortIndicator('avg24hPrice')}
                    </button>
                  </th>
                  <th className="w-40 px-4 py-3">
                    <button
                      className="cursor-pointer text-left transition hover:text-violet-300"
                      onClick={() => handleColumnSort('traderSell')}
                      type="button"
                    >
                      Продажа торговцу {getSortIndicator('traderSell')}
                    </button>
                  </th>
                  <th className="w-40 px-4 py-3">
                    <button
                      className="cursor-pointer text-left transition hover:text-violet-300"
                      onClick={() => handleColumnSort('traderBuy')}
                      type="button"
                    >
                      Покупка у торговца {getSortIndicator('traderBuy')}
                    </button>
                  </th>
                  <th className="w-44 px-4 py-3">
                    <button
                      className="cursor-pointer text-left transition hover:text-violet-300"
                      onClick={() => handleColumnSort('sellToTraderFromMarket')}
                      type="button"
                    >
                      Барахолка → торговец {getSortIndicator('sellToTraderFromMarket')}
                    </button>
                  </th>
                  <th className="w-44 px-4 py-3">
                    <button
                      className="cursor-pointer text-left transition hover:text-violet-300"
                      onClick={() => handleColumnSort('sellToMarketFromTrader')}
                      type="button"
                    >
                      Торговец → барахолка {getSortIndicator('sellToMarketFromTrader')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/50">
                {items.map((item) => {
                  const meta = item.meta;
                  const traderSellPrice = meta.maxSellFor ?? getBestTraderSellPricePoint(meta.sellFor);
                  const traderBuyPrice = meta.minBuyFor ?? getBestTraderBuyPricePoint(meta.buyFor);
                  const fleaToTraderValue = meta.sellToTraderFromMarket ?? getFleaToTraderValue(meta);
                  const traderToFleaValue = meta.sellToMarketFromTrader ?? getTraderToFleaValue(meta);

                  return (
                    <tr className="align-top text-sm text-slate-200" key={item.id}>
                      <td className="px-4 py-3">
                        {meta.image512pxLink ? (
                          <img
                            alt={meta.name}
                            className="h-16 w-16 rounded-xl border border-slate-800 object-contain bg-slate-900"
                            loading="lazy"
                            src={meta.image512pxLink}
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-500">
                            Нет фото
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-100">{meta.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        {meta.wikiLink ? (
                          <a
                            className="text-violet-300 underline decoration-violet-500/40 underline-offset-4 transition hover:text-violet-200"
                            href={meta.wikiLink}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Wiki
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100">{formatPrice(meta.avg24hPrice)}</td>
                      <td className="px-4 py-3">{formatPricePoint(traderSellPrice)}</td>
                      <td className="px-4 py-3">{formatPricePoint(traderBuyPrice)}</td>
                      <td className="px-4 py-3">{formatPrice(fleaToTraderValue)}</td>
                      <td className="px-4 py-3">{formatPrice(traderToFleaValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          {marketQuery.isFetchingNextPage ? (
            <div className="inline-flex animate-pulse items-center rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
              Загружаю следующую страницу...
            </div>
          ) : null}
          {!marketQuery.isFetchingNextPage && marketQuery.hasNextPage ? (
            <div ref={sentinelRef} />
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
