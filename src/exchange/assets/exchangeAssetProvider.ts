import { createExchangeHttpClient } from "../http";
import { createBinanceMarketDataClient } from "../plugins/binance/binanceMarketData";
import { createMexcMarketDataClient } from "../plugins/mexc/mexcMarketData";
import { createHtxMarketDataClient } from "../plugins/htx/htxMarketData";
import { createExchangeConfig } from "../config";
import type { ExchangeId } from "../domain/exchangeId";

export interface ExchangeAssetProvider {
  getAssets(exchangeId: ExchangeId): Promise<readonly string[]>;
}

function createAssetList(
  symbols: readonly {
    readonly baseAsset: { readonly symbol: string };
    readonly quoteAsset: { readonly symbol: string };
    readonly marketType: string;
  }[],
): readonly string[] {
  const assets = new Set<string>();

  for (const symbol of symbols) {
    if (symbol.marketType !== "spot") continue;
    assets.add(symbol.baseAsset.symbol);
    assets.add(symbol.quoteAsset.symbol);
  }

  return Object.freeze([...assets].sort());
}

export function createExchangeAssetProvider(): ExchangeAssetProvider {
  return {
    async getAssets(exchangeId) {
      const config = createExchangeConfig(exchangeId);

      const httpClient = createExchangeHttpClient({
        exchange: config.id,
        baseUrl: config.baseUrl,
        defaultTimeoutMs: 30_000,
      });

      switch (exchangeId) {
        case "binance":
          return createAssetList(
            await createBinanceMarketDataClient(httpClient).getSymbols(),
          );

        case "mexc":
          return createAssetList(
            await createMexcMarketDataClient(httpClient).getSymbols(),
          );

        case "htx":
          return createAssetList(
            await createHtxMarketDataClient(httpClient).getSymbols(),
          );
      }
    },
  };
}
