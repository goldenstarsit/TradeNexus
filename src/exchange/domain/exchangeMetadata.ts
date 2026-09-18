import type { ExchangeId } from "./exchangeId";
import { isExchangeId } from "./exchangeId";
import type { ExchangeStatus } from "./exchangeStatus";
import type { MarketType } from "./marketType";

export interface ExchangeMetadata {
  readonly id: ExchangeId;
  readonly name: string;
  readonly status: ExchangeStatus;
  readonly baseUrl: string;
  readonly marketTypes: readonly MarketType[];
}

const EXCHANGE_STATUSES = [
  "enabled",
  "disabled",
  "degraded",
  "unavailable",
] as const;

const MARKET_TYPES: readonly MarketType[] = ["spot", "futures"];

function isExchangeStatus(value: unknown): value is ExchangeStatus {
  return (
    typeof value === "string" &&
    (EXCHANGE_STATUSES as readonly string[]).includes(value)
  );
}

function isMarketType(value: unknown): value is MarketType {
  return (
    typeof value === "string" &&
    (MARKET_TYPES as readonly string[]).includes(value)
  );
}

function normalizeRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

export function createExchangeMetadata(input: {
  readonly id: ExchangeId;
  readonly name: string;
  readonly status: ExchangeStatus;
  readonly baseUrl: string;
  readonly marketTypes: readonly MarketType[];
}): ExchangeMetadata {
  if (!isExchangeId(input.id)) {
    throw new Error(`Unsupported exchange ID: ${String(input.id)}`);
  }

  if (!isExchangeStatus(input.status)) {
    throw new Error(`Unsupported exchange status: ${String(input.status)}`);
  }

  const name = normalizeRequiredString(input.name, "Exchange name");
  const baseUrl = normalizeRequiredString(input.baseUrl, "Base URL");

  try {
    new URL(baseUrl);
  } catch {
    throw new Error("Base URL must be a valid URL");
  }

  if (input.marketTypes.length === 0) {
    throw new Error("At least one market type is required");
  }

  const marketTypes = input.marketTypes.map((marketType) => {
    if (!isMarketType(marketType)) {
      throw new Error(`Unsupported market type: ${String(marketType)}`);
    }

    return marketType;
  });

  if (new Set(marketTypes).size !== marketTypes.length) {
    throw new Error("Duplicate market types are not allowed");
  }

  return Object.freeze({
    id: input.id,
    name,
    status: input.status,
    baseUrl,
    marketTypes: Object.freeze(marketTypes),
  });
}
