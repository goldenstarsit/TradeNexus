import type { ExchangeId } from "../domain/exchangeId";
import type { MarketType } from "../domain/marketType";

export interface SymbolMapping {
  readonly canonicalSymbol: string;
  readonly exchangeId: ExchangeId;
  readonly exchangeSymbol: string;
  readonly marketType: MarketType;
}

export interface SymbolMappingManager {
  register(mapping: SymbolMapping): void;
  has(canonicalSymbol: string, exchangeId: ExchangeId, marketType: MarketType): boolean;
  get(canonicalSymbol: string, exchangeId: ExchangeId, marketType: MarketType): SymbolMapping;
  getExchangeSymbol(
    canonicalSymbol: string,
    exchangeId: ExchangeId,
    marketType: MarketType,
  ): string;
  getAll(canonicalSymbol?: string): readonly SymbolMapping[];
}

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();

  if (!normalized) {
    throw new Error("Symbol cannot be empty");
  }

  return normalized;
}

function mappingKey(
  canonicalSymbol: string,
  exchangeId: ExchangeId,
  marketType: MarketType,
): string {
  return `${normalizeSymbol(canonicalSymbol)}:${exchangeId}:${marketType}`;
}

export function createSymbolMappingManager(
  mappings: readonly SymbolMapping[] = [],
): SymbolMappingManager {
  const registry = new Map<string, SymbolMapping>();

  function register(mapping: SymbolMapping): void {
    const canonicalSymbol = normalizeSymbol(mapping.canonicalSymbol);
    const exchangeSymbol = normalizeSymbol(mapping.exchangeSymbol);
    const key = mappingKey(
      canonicalSymbol,
      mapping.exchangeId,
      mapping.marketType,
    );

    if (registry.has(key)) {
      throw new Error(
        `Symbol mapping already registered: ${canonicalSymbol} -> ${mapping.exchangeId}`,
      );
    }

    registry.set(key, {
      ...mapping,
      canonicalSymbol,
      exchangeSymbol,
    });
  }

  function get(
    canonicalSymbol: string,
    exchangeId: ExchangeId,
    marketType: MarketType,
  ): SymbolMapping {
    const normalizedCanonicalSymbol = normalizeSymbol(canonicalSymbol);
    const mapping = registry.get(
      mappingKey(normalizedCanonicalSymbol, exchangeId, marketType),
    );

    if (!mapping) {
      throw new Error(
        `Symbol mapping not registered: ${normalizedCanonicalSymbol} -> ${exchangeId}`,
      );
    }

    return mapping;
  }

  for (const mapping of mappings) {
    register(mapping);
  }

  return {
    register,

    has(canonicalSymbol, exchangeId, marketType) {
      return registry.has(mappingKey(canonicalSymbol, exchangeId, marketType));
    },

    get,

    getExchangeSymbol(canonicalSymbol, exchangeId, marketType) {
      return get(canonicalSymbol, exchangeId, marketType).exchangeSymbol;
    },

    getAll(canonicalSymbol) {
      if (canonicalSymbol === undefined) {
        return Object.freeze([...registry.values()]);
      }

      const normalizedCanonicalSymbol = normalizeSymbol(canonicalSymbol);

      return Object.freeze(
        [...registry.values()].filter(
          (mapping) => mapping.canonicalSymbol === normalizedCanonicalSymbol,
        ),
      );
    },
  };
}
