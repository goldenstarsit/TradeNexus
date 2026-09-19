import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { MarketTicker, OrderBook } from "../../market-data/marketData";
import type { TradingSymbol } from "../../domain/symbol";
import { createTradingSymbol } from "../../domain/symbol";

export interface BinanceMarketDataClient {
  getSymbols(): Promise<readonly TradingSymbol[]>;
  getSymbol(symbol: string): Promise<TradingSymbol | undefined>;
  getTicker(symbol: string): Promise<MarketTicker>;
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
}

interface BinanceTickerResponse {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  bidQty: string;
  askQty: string;
  volume: string;
  quoteVolume: string;
  closeTime: number;
}

interface BinanceOrderBookResponse {
  bids: [string, string][];
  asks: [string, string][];
  lastUpdateId: number;
}

interface BinanceExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

interface BinanceExchangeInfoResponse {
  symbols: BinanceExchangeInfoSymbol[];
}

interface BinanceExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

interface BinanceExchangeInfoResponse {
  symbols: BinanceExchangeInfoSymbol[];
}

function toNumber(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid Binance numeric value: ${value}`);
  return number;
}

export function createBinanceMarketDataClient(
  httpClient: ExchangeHttpClient,
): BinanceMarketDataClient {
  let symbolsCache: readonly TradingSymbol[] | undefined;

  async function loadSymbols(): Promise<readonly TradingSymbol[]> {
    if (symbolsCache) return symbolsCache;

    const response = await httpClient.request<BinanceExchangeInfoResponse>({
      method: "GET",
      path: "/api/v3/exchangeInfo",
    });

    const symbols = response.data.symbols
      .filter((item) => item.status === "TRADING")
      .map((item) =>
        createTradingSymbol({
          exchangeSymbol: item.symbol,
          baseAsset: item.baseAsset,
          quoteAsset: item.quoteAsset,
          marketType: "spot",
        }),
      );

    symbolsCache = Object.freeze(symbols);
    return symbolsCache;
  }

  return {
    async getSymbols() {
      return loadSymbols();
    },

    async getSymbol(symbol) {
      const normalized = symbol.trim().toUpperCase();
      return (await loadSymbols()).find(
        (item) => item.exchangeSymbol === normalized,
      );
    },

    async getTicker(symbol) {
      const response = await httpClient.request<BinanceTickerResponse>({
        method: "GET",
        path: "/api/v3/ticker/24hr",
        query: { symbol: symbol.trim().toUpperCase() },
      });

      return {
        symbol: response.data.symbol,
        lastPrice: toNumber(response.data.lastPrice),
        bidPrice: toNumber(response.data.bidPrice),
        askPrice: toNumber(response.data.askPrice),
        bidQuantity: toNumber(response.data.bidQty),
        askQuantity: toNumber(response.data.askQty),
        volume: toNumber(response.data.volume),
        quoteVolume: toNumber(response.data.quoteVolume),
        timestamp: response.data.closeTime,
      };
    },

    async getOrderBook(symbol, limit = 100) {
      const response = await httpClient.request<BinanceOrderBookResponse>({
        method: "GET",
        path: "/api/v3/depth",
        query: {
          symbol: symbol.trim().toUpperCase(),
          limit,
        },
      });

      return {
        symbol: symbol.trim().toUpperCase(),
        bids: response.data.bids.map(([price, quantity]) => ({
          price: toNumber(price),
          quantity: toNumber(quantity),
        })),
        asks: response.data.asks.map(([price, quantity]) => ({
          price: toNumber(price),
          quantity: toNumber(quantity),
        })),
        timestamp: Date.now(),
      };
    },
  };
}
