import type { MarketType } from "./marketType";

export interface Asset {
  readonly symbol: string;
}

export interface TradingSymbol {
  readonly exchangeSymbol: string;
  readonly baseAsset: Asset;
  readonly quoteAsset: Asset;
  readonly marketType: MarketType;
}

function normalizeSymbol(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim().toUpperCase();
}

function isMarketType(value: string): value is MarketType {
  return value === "spot" || value === "futures";
}

export function createAsset(symbol: string): Asset {
  return Object.freeze({
    symbol: normalizeSymbol(symbol, "Asset symbol"),
  });
}

export function createTradingSymbol(input: {
  readonly exchangeSymbol: string;
  readonly baseAsset: string | Asset;
  readonly quoteAsset: string | Asset;
  readonly marketType: MarketType;
}): TradingSymbol {
  if (!isMarketType(input.marketType)) {
    throw new Error(`Unsupported market type: ${String(input.marketType)}`);
  }

  const baseSymbol =
    typeof input.baseAsset === "string"
      ? normalizeSymbol(input.baseAsset, "Base asset")
      : normalizeSymbol(input.baseAsset.symbol, "Base asset");

  const quoteSymbol =
    typeof input.quoteAsset === "string"
      ? normalizeSymbol(input.quoteAsset, "Quote asset")
      : normalizeSymbol(input.quoteAsset.symbol, "Quote asset");

  return Object.freeze({
    exchangeSymbol: normalizeSymbol(input.exchangeSymbol, "Exchange symbol"),
    baseAsset: createAsset(baseSymbol),
    quoteAsset: createAsset(quoteSymbol),
    marketType: input.marketType,
  });
}
