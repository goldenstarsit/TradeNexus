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
  const supported = new Set<ExchangeCapability>(capabilities);

  return {
    exchangeId,
    supported,
    supports(capability) {
      return supported.has(capability);
    },
  };
}
