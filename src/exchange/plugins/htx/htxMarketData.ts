import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { MarketTicker, OrderBook } from "../../market-data/marketData";

export interface HtxMarketDataClient {
  getTicker(symbol: string): Promise<MarketTicker>;
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
}

interface HtxTickerResponse {
  status: string;
  ts: number;
  tick: {
    close: number;
    amount: number;
    vol: number;
    bid: [number, number];
    ask: [number, number];
  };
}

interface HtxDepthResponse {
  status: string;
  ts: number;
  tick: {
    bids: Array<[number, number]>;
    asks: Array<[number, number]>;
  };
}

function toNumber(value: number | string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid HTX numeric value: ${value}`);
  }
  return number;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toLowerCase();
}

function normalizeDepth(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  if (limit === 5 || limit === 10 || limit === 20) return limit;
  return 20;
}

export function createHtxMarketDataClient(
  httpClient: ExchangeHttpClient,
): HtxMarketDataClient {
  return {
    async getTicker(symbol) {
      const normalizedSymbol = normalizeSymbol(symbol);
      const response = await httpClient.request<HtxTickerResponse>({
        method: "GET",
        path: "/market/detail/merged",
        query: { symbol: normalizedSymbol },
      });

      return {
        symbol: normalizedSymbol.toUpperCase(),
        lastPrice: toNumber(response.data.tick.close),
        bidPrice: toNumber(response.data.tick.bid[0]),
        askPrice: toNumber(response.data.tick.ask[0]),
        bidQuantity: toNumber(response.data.tick.bid[1]),
        askQuantity: toNumber(response.data.tick.ask[1]),
        volume: toNumber(response.data.tick.amount),
        quoteVolume: toNumber(response.data.tick.vol),
        timestamp: response.data.ts,
      };
    },

    async getOrderBook(symbol, limit) {
      const normalizedSymbol = normalizeSymbol(symbol);
      const depth = normalizeDepth(limit);
      const query: Record<string, string | number> = {
        symbol: normalizedSymbol,
        type: "step0",
      };
      if (depth !== undefined) query.depth = depth;

      const response = await httpClient.request<HtxDepthResponse>({
        method: "GET",
        path: "/market/depth",
        query,
      });

      return {
        symbol: normalizedSymbol.toUpperCase(),
        bids: response.data.tick.bids.map(([price, quantity]) => ({
          price: toNumber(price),
          quantity: toNumber(quantity),
        })),
        asks: response.data.tick.asks.map(([price, quantity]) => ({
          price: toNumber(price),
          quantity: toNumber(quantity),
        })),
        timestamp: response.data.ts,
      };
    },
  };
}
