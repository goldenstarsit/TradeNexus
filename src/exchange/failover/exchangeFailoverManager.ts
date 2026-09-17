import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangeHealth } from "../health/exchangeHealthMonitor";

export interface ExchangeFailoverManager {
  getActiveExchange(): ExchangeId;
  getConfiguredExchanges(): readonly ExchangeId[];
  updateHealth(health: ExchangeHealth): ExchangeId;
  recover(exchangeId: ExchangeId): ExchangeId;
  failover(): ExchangeId;
}

export interface ExchangeFailoverManagerOptions {
  readonly exchanges: readonly ExchangeId[];
  readonly isHealthy?: (exchangeId: ExchangeId) => boolean;
}

export function createExchangeFailoverManager(
  options: ExchangeFailoverManagerOptions,
): ExchangeFailoverManager {
  const exchanges = [...new Set(options.exchanges)];

  if (exchanges.length === 0) {
    throw new Error("At least one exchange is required for failover");
  }

  const healthy = new Map<ExchangeId, boolean>(
    exchanges.map((exchangeId) => [exchangeId, true]),
  );

  const isHealthy =
    options.isHealthy ??
    ((exchangeId: ExchangeId) => healthy.get(exchangeId) === true);

  let activeExchange = exchanges[0]!;

  function findHealthyExchange(): ExchangeId | undefined {
    return exchanges.find((exchangeId) => isHealthy(exchangeId));
  }

  function failover(): ExchangeId {
    const nextExchange = findHealthyExchange();

    if (!nextExchange) {
      throw new Error("No healthy exchange available for failover");
    }

    activeExchange = nextExchange;
    return activeExchange;
  }

  return {
    getActiveExchange() {
      return activeExchange;
    },

    getConfiguredExchanges() {
      return Object.freeze([...exchanges]);
    },

    updateHealth(health) {
      if (!healthy.has(health.exchangeId)) {
        throw new Error(
          `Exchange not configured for failover: ${health.exchangeId}`,
        );
      }

      healthy.set(health.exchangeId, health.healthy);

      if (health.exchangeId === activeExchange && !health.healthy) {
        return failover();
      }

      if (
        health.exchangeId !== exchanges[0] &&
        health.healthy &&
        isHealthy(exchanges[0]!)
      ) {
        activeExchange = exchanges[0]!;
      }

      return activeExchange;
    },

    recover(exchangeId) {
      if (!healthy.has(exchangeId)) {
        throw new Error(
          `Exchange not configured for failover: ${exchangeId}`,
        );
      }

      healthy.set(exchangeId, true);

      if (exchangeId === exchanges[0]) {
        activeExchange = exchangeId;
      }

      return activeExchange;
    },

    failover,
  };
}
