import { createExchangeHttpClient } from "../http";
import { createBinanceMarketDataClient } from "../plugins/binance/binanceMarketData";
import { createMexcMarketDataClient } from "../plugins/mexc/mexcMarketData";
import { createHtxMarketDataClient } from "../plugins/htx/htxMarketData";
import { createExchangeConfig } from "../config";
import type { ExchangeId } from "../domain/exchangeId";
import type { TradingSymbol } from "../domain/symbol";

export interface ExchangeSymbolProvider {
  getSymbols(exchangeId: ExchangeId): Promise<readonly TradingSymbol[]>;
}

export function createExchangeSymbolProvider(): ExchangeSymbolProvider {
  return {
    async getSymbols(exchangeId) {
      const config = createExchangeConfig(exchangeId);

      const httpClient = createExchangeHttpClient({
        exchange: config.id,
        baseUrl: config.baseUrl,
        defaultTimeoutMs: 30_000,
      });

      switch (exchangeId) {
        case "binance":
          return createBinanceMarketDataClient(httpClient).getSymbols();

        case "mexc":
          return createMexcMarketDataClient(httpClient).getSymbols();

        case "htx":
          return createHtxMarketDataClient(httpClient).getSymbols();
      }
    },
  };
}
