import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangeConfig } from "./exchangeConfig";

const DEFAULT_CONFIG: Record<ExchangeId, ExchangeConfig> = {
  binance: {
    id: "binance",
    name: "Binance",
    baseUrl: "https://api.binance.com",
    marketTypes: ["spot", "futures"],
    enabled: false,
  },
  mexc: {
    id: "mexc",
    name: "MEXC",
    baseUrl: "https://api.mexc.com",
    marketTypes: ["spot", "futures"],
    enabled: false,
  },
  htx: {
    id: "htx",
    name: "HTX",
    baseUrl: "https://api.huobi.pro",
    marketTypes: ["spot", "futures"],
    enabled: false,
  },
};

export function getDefaultExchangeConfig(exchangeId: ExchangeId): ExchangeConfig {
  const config = DEFAULT_CONFIG[exchangeId];
  return {
    ...config,
    marketTypes: [...config.marketTypes],
  };
}

export function createExchangeConfig(
  exchangeId: ExchangeId,
  overrides: Partial<Omit<ExchangeConfig, "id">> = {},
): ExchangeConfig {
  return {
    ...getDefaultExchangeConfig(exchangeId),
    ...overrides,
    id: exchangeId,
  };
}
