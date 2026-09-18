import type { ExchangeId } from "../domain/exchangeId";
import { isExchangeId } from "../domain/exchangeId";
import type { MarketType } from "../domain/marketType";
import { isMarketType } from "../domain/marketType";
import type { ExchangeConfig } from "./exchangeConfig";

const DEFAULT_CONFIG: Record<ExchangeId, ExchangeConfig> = {
  binance: Object.freeze({
    id: "binance",
    name: "Binance",
    baseUrl: "https://api.binance.com",
    marketTypes: Object.freeze(["spot", "futures"] as MarketType[]),
    enabled: false,
  }),
  mexc: Object.freeze({
    id: "mexc",
    name: "MEXC",
    baseUrl: "https://api.mexc.com",
    marketTypes: Object.freeze(["spot", "futures"] as MarketType[]),
    enabled: false,
  }),
  htx: Object.freeze({
    id: "htx",
    name: "HTX",
    baseUrl: "https://api.huobi.pro",
    marketTypes: Object.freeze(["spot", "futures"] as MarketType[]),
    enabled: false,
  }),
};

function normalizeRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function validateBaseUrl(value: unknown): string {
  const url = normalizeRequiredString(value, "Base URL");

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid base URL: ${url}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsupported base URL protocol: ${parsed.protocol}`);
  }

  return parsed.toString().replace(/\/$/, "");
}

function normalizeMarketTypes(
  marketTypes: readonly MarketType[],
): readonly MarketType[] {
  if (!Array.isArray(marketTypes) || marketTypes.length === 0) {
    throw new Error("Market types cannot be empty");
  }

  const normalized: MarketType[] = [];

  for (const marketType of marketTypes) {
    if (!isMarketType(marketType)) {
      throw new Error(`Unsupported market type: ${String(marketType)}`);
    }

    if (!normalized.includes(marketType)) {
      normalized.push(marketType);
    }
  }

  return Object.freeze(normalized);
}

function validateExchangeId(value: unknown): ExchangeId {
  if (typeof value !== "string" || !isExchangeId(value)) {
    throw new Error(`Unsupported exchange ID: ${String(value)}`);
  }

  return value;
}

function createValidatedConfig(input: {
  readonly id: ExchangeId;
  readonly name: string;
  readonly baseUrl: string;
  readonly marketTypes: readonly MarketType[];
  readonly enabled: boolean;
}): ExchangeConfig {
  if (typeof input.enabled !== "boolean") {
    throw new Error("Enabled must be a boolean");
  }

  return Object.freeze({
    id: validateExchangeId(input.id),
    name: normalizeRequiredString(input.name, "Exchange name"),
    baseUrl: validateBaseUrl(input.baseUrl),
    marketTypes: normalizeMarketTypes(input.marketTypes),
    enabled: input.enabled,
  });
}

export function getDefaultExchangeConfig(
  exchangeId: ExchangeId,
): ExchangeConfig {
  const normalizedExchangeId = validateExchangeId(exchangeId);
  const config = DEFAULT_CONFIG[normalizedExchangeId];

  return createValidatedConfig({
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    marketTypes: config.marketTypes,
    enabled: config.enabled,
  });
}

export function createExchangeConfig(
  exchangeId: ExchangeId,
  overrides: Partial<Omit<ExchangeConfig, "id">> = {},
): ExchangeConfig {
  const base = getDefaultExchangeConfig(exchangeId);

  return createValidatedConfig({
    id: exchangeId,
    name: overrides.name ?? base.name,
    baseUrl: overrides.baseUrl ?? base.baseUrl,
    marketTypes: overrides.marketTypes ?? base.marketTypes,
    enabled: overrides.enabled ?? base.enabled,
  });
}
