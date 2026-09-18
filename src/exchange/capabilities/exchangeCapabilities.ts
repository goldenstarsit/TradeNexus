import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangeCapability } from "./exchangeCapability";

export interface ExchangeCapabilities {
  readonly exchangeId: ExchangeId;
  readonly supported: ReadonlySet<ExchangeCapability>;

  supports(capability: ExchangeCapability): boolean;
}

export function createExchangeCapabilities(
  exchangeId: ExchangeId,
  capabilities: readonly ExchangeCapability[],
): ExchangeCapabilities {
  const capabilitySet = new Set<ExchangeCapability>(capabilities);

  const supported: ReadonlySet<ExchangeCapability> = new Proxy(capabilitySet, {
    get(target, property, receiver) {
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
  });

  return Object.freeze({
    exchangeId,
    supported,
    supports(capability: ExchangeCapability) {
      return capabilitySet.has(capability);
    },
  });
}
