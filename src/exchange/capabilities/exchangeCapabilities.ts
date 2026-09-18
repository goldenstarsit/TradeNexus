import type { ExchangeId } from "../domain/exchangeId";
import { isExchangeId } from "../domain/exchangeId";
import type { ExchangeCapability } from "./exchangeCapability";

const EXCHANGE_CAPABILITIES: readonly ExchangeCapability[] = [
  "spot",
  "futures",
  "marketOrders",
  "limitOrders",
  "makerOnlyOrders",
  "cancelReplace",
  "orderBook",
  "websocketMarketData",
  "websocketUserData",
  "balances",
  "orderHistory",
  "tradeHistory",
  "rateLimits",
];

function isExchangeCapability(
  value: unknown,
): value is ExchangeCapability {
  return (
    typeof value === "string" &&
    (EXCHANGE_CAPABILITIES as readonly string[]).includes(value)
  );
}

function validateExchangeId(value: unknown): ExchangeId {
  if (typeof value !== "string" || !isExchangeId(value)) {
    throw new Error(`Unsupported exchange ID: ${String(value)}`);
  }

  return value;
}

function normalizeCapabilities(
  capabilities: readonly ExchangeCapability[],
): readonly ExchangeCapability[] {
  const normalized: ExchangeCapability[] = [];

  for (const capability of capabilities) {
    if (!isExchangeCapability(capability)) {
      throw new Error(
        `Unsupported exchange capability: ${String(capability)}`,
      );
    }

    if (!normalized.includes(capability)) {
      normalized.push(capability);
    }
  }

  return Object.freeze(normalized);
}

export interface ExchangeCapabilities {
  readonly exchangeId: ExchangeId;
  readonly supported: ReadonlySet<ExchangeCapability>;

  supports(capability: ExchangeCapability): boolean;
}

export function createExchangeCapabilities(
  exchangeId: ExchangeId,
  capabilities: readonly ExchangeCapability[],
): ExchangeCapabilities {
  const normalizedExchangeId = validateExchangeId(exchangeId);
  const normalizedCapabilities = normalizeCapabilities(capabilities);
  const capabilitySet = new Set<ExchangeCapability>(
    normalizedCapabilities,
  );

  const supported: ReadonlySet<ExchangeCapability> = new Proxy(
    capabilitySet,
    {
      get(target, property) {
        if (
          property === "add" ||
          property === "delete" ||
          property === "clear"
        ) {
          return () => {
            throw new TypeError("Exchange capabilities are immutable");
          };
        }

        const value = Reflect.get(target, property, target);

        if (typeof value === "function") {
          return value.bind(target);
        }

        return value;
      },
    },
  );

  return Object.freeze({
    exchangeId: normalizedExchangeId,
    supported,
    supports(capability: ExchangeCapability) {
      if (!isExchangeCapability(capability)) {
        return false;
      }

      return capabilitySet.has(capability);
    },
  });
}
