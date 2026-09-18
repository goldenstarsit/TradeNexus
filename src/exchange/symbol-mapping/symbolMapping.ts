import type { ExchangeId } from "../domain/exchangeId";
import { isExchangeId } from "../domain/exchangeId";
import type { MarketType } from "../domain/marketType";

const MARKET_TYPES = ["spot", "futures"] as const;

function isMarketType(value: unknown): value is MarketType {
  return typeof value === "string" && MARKET_TYPES.includes(value as MarketType);
}

export interface SymbolMapping {
  readonly canonicalSymbol: string;
  readonly exchangeId: ExchangeId;
  readonly exchangeSymbol: string;
  readonly marketType: MarketType;
}

export interface SymbolMappingManager {
  register(mapping: SymbolMapping): void;
  has(
    canonicalSymbol: string,
    exchangeId: ExchangeId,
    marketType: MarketType,
  ): boolean;
  get(
    canonicalSymbol: string,
    exchangeId: ExchangeId,
    marketType: MarketType,
  ): SymbolMapping;
  getExchangeSymbol(
    canonicalSymbol: string,
    exchangeId: ExchangeId,
    marketType: MarketType,
  ): string;
  getAll(canonicalSymbol?: string): readonly SymbolMapping[];
}

function normalizeSymbol(symbol: string, field = "Symbol"): string {
  if (typeof symbol !== "string" || !symbol.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return symbol.trim().toUpperCase();
}

function validateExchangeId(value: unknown): ExchangeId {
  if (typeof value !== "string" || !isExchangeId(value)) {
    throw new Error(`Unsupported exchange ID: ${String(value)}`);
  }

  return value;
}

function validateMarketType(value: unknown): MarketType {
  if (!isMarketType(value)) {
    throw new Error(`Unsupported market type: ${String(value)}`);
  }

  return value;
}

function mappingKey(
  canonicalSymbol: string,
  exchangeId: ExchangeId,
  marketType: MarketType,
): string {
  return `${normalizeSymbol(canonicalSymbol)}:${exchangeId}:${marketType}`;
}

function freezeMapping(
  mapping: SymbolMapping,
): SymbolMapping {
  return Object.freeze({
    canonicalSymbol: normalizeSymbol(
      mapping.canonicalSymbol,
      "Canonical symbol",
    ),
    exchangeId: validateExchangeId(mapping.exchangeId),
    exchangeSymbol: normalizeSymbol(
      mapping.exchangeSymbol,
      "Exchange symbol",
    ),
    marketType: validateMarketType(mapping.marketType),
  });
}

export function createSymbolMappingManager(
  mappings: readonly SymbolMapping[] = [],
): SymbolMappingManager {
  const registry = new Map<string, SymbolMapping>();

  function register(mapping: SymbolMapping): void {
    const normalizedMapping = freezeMapping(mapping);

    const key = mappingKey(
      normalizedMapping.canonicalSymbol,
      normalizedMapping.exchangeId,
      normalizedMapping.marketType,
    );

    if (registry.has(key)) {
      throw new Error(
        `Symbol mapping already registered: ${normalizedMapping.canonicalSymbol} -> ${normalizedMapping.exchangeId}`,
      );
    }

    registry.set(key, normalizedMapping);
  }

  function get(
    canonicalSymbol: string,
    exchangeId: ExchangeId,
    marketType: MarketType,
  ): SymbolMapping {
    const normalizedCanonicalSymbol = normalizeSymbol(canonicalSymbol);

    const normalizedExchangeId = validateExchangeId(exchangeId);
    const normalizedMarketType = validateMarketType(marketType);

    const mapping = registry.get(
      mappingKey(
        normalizedCanonicalSymbol,
        normalizedExchangeId,
        normalizedMarketType,
      ),
    );

    if (!mapping) {
      throw new Error(
        `Symbol mapping not registered: ${normalizedCanonicalSymbol} -> ${normalizedExchangeId}`,
      );
    }

    return mapping;
  }

  for (const mapping of mappings) {
    register(mapping);
  }

  return Object.freeze({
    register,

    has(
      canonicalSymbol: string,
      exchangeId: ExchangeId,
      marketType: MarketType,
    ) {
      const normalizedCanonicalSymbol = normalizeSymbol(canonicalSymbol);
      const normalizedExchangeId = validateExchangeId(exchangeId);
      const normalizedMarketType = validateMarketType(marketType);

      return registry.has(
        mappingKey(
          normalizedCanonicalSymbol,
          normalizedExchangeId,
          normalizedMarketType,
        ),
      );
    },

    get,

    getExchangeSymbol(
      canonicalSymbol: string,
      exchangeId: ExchangeId,
      marketType: MarketType,
    ) {
      return get(canonicalSymbol, exchangeId, marketType).exchangeSymbol;
    },

    getAll(canonicalSymbol?: string) {
      const mappings = [...registry.values()];

      if (canonicalSymbol === undefined) {
        return Object.freeze(mappings);
      }

      const normalizedCanonicalSymbol = normalizeSymbol(canonicalSymbol);

      return Object.freeze(
        mappings.filter(
          (mapping) =>
            mapping.canonicalSymbol === normalizedCanonicalSymbol,
        ),
      );
    },
  });
}
