import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangeStatus } from "../domain/exchangeStatus";

export interface ExchangeHealth {
  readonly exchangeId: ExchangeId;
  readonly status: ExchangeStatus;
  readonly healthy: boolean;
  readonly latencyMs?: number;
  readonly consecutiveFailures: number;
  readonly lastCheckedAt?: number;
  readonly lastSuccessfulAt?: number;
  readonly lastFailureAt?: number;
  readonly lastError?: string;
}

export interface ExchangeHealthProbeResult {
  readonly healthy: boolean;
  readonly latencyMs?: number;
  readonly error?: string;
}

export type ExchangeHealthProbe = (
  exchangeId: ExchangeId,
) => Promise<ExchangeHealthProbeResult>;

export interface ExchangeHealthMonitorOptions {
  readonly failureThreshold?: number;
  readonly now?: () => number;
}

export interface ExchangeHealthMonitor {
  register(exchangeId: ExchangeId): void;
  has(exchangeId: ExchangeId): boolean;
  get(exchangeId: ExchangeId): ExchangeHealth;
  getAll(): readonly ExchangeHealth[];
  recordSuccess(
    exchangeId: ExchangeId,
    latencyMs?: number,
  ): ExchangeHealth;
  recordFailure(
    exchangeId: ExchangeId,
    error?: string,
  ): ExchangeHealth;
  check(
    exchangeId: ExchangeId,
    probe: ExchangeHealthProbe,
  ): Promise<ExchangeHealth>;
  checkAll(
    probe: ExchangeHealthProbe,
  ): Promise<readonly ExchangeHealth[]>;
}

const DEFAULT_FAILURE_THRESHOLD = 3;

export function createExchangeHealthMonitor(
  exchangeIds: readonly ExchangeId[] = [],
  options: ExchangeHealthMonitorOptions = {},
): ExchangeHealthMonitor {
  const registry = new Map<ExchangeId, ExchangeHealth>();
  const failureThreshold = Math.max(
    1,
    Math.floor(options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD),
  );
  const now = options.now ?? (() => Date.now());

  function createInitialHealth(exchangeId: ExchangeId): ExchangeHealth {
    return {
      exchangeId,
      status: "disabled",
      healthy: false,
      consecutiveFailures: 0,
    };
  }

  function register(exchangeId: ExchangeId): void {
    if (registry.has(exchangeId)) {
      throw new Error(
        `Exchange health already registered: ${exchangeId}`,
      );
    }

    registry.set(exchangeId, createInitialHealth(exchangeId));
  }

  function get(exchangeId: ExchangeId): ExchangeHealth {
    const health = registry.get(exchangeId);

    if (!health) {
      throw new Error(
        `Exchange health not registered: ${exchangeId}`,
      );
    }

    return health;
  }

  function recordSuccess(
    exchangeId: ExchangeId,
    latencyMs?: number,
  ): ExchangeHealth {
    const current = get(exchangeId);
    const timestamp = now();

    const health: ExchangeHealth = {
      exchangeId,
      status: "enabled",
      healthy: true,
      latencyMs,
      consecutiveFailures: 0,
      lastCheckedAt: timestamp,
      lastSuccessfulAt: timestamp,
    };

    registry.set(exchangeId, health);
    return health;
  }

  function recordFailure(
    exchangeId: ExchangeId,
    error?: string,
  ): ExchangeHealth {
    const current = get(exchangeId);
    const timestamp = now();
    const consecutiveFailures = current.consecutiveFailures + 1;
    const status =
      consecutiveFailures >= failureThreshold
        ? "unavailable"
        : "degraded";

    const health: ExchangeHealth = {
      exchangeId,
      status,
      healthy: false,
      latencyMs: current.latencyMs,
      consecutiveFailures,
      lastCheckedAt: timestamp,
      lastSuccessfulAt: current.lastSuccessfulAt,
      lastFailureAt: timestamp,
      lastError: error,
    };

    registry.set(exchangeId, health);
    return health;
  }

  async function check(
    exchangeId: ExchangeId,
    probe: ExchangeHealthProbe,
  ): Promise<ExchangeHealth> {
    get(exchangeId);

    try {
      const result = await probe(exchangeId);

      if (result.healthy) {
        return recordSuccess(exchangeId, result.latencyMs);
      }

      return recordFailure(exchangeId, result.error);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      return recordFailure(exchangeId, message);
    }
  }

  for (const exchangeId of exchangeIds) {
    register(exchangeId);
  }

  return {
    register,

    has(exchangeId) {
      return registry.has(exchangeId);
    },

    get,

    getAll() {
      return Object.freeze([...registry.values()]);
    },

    recordSuccess,

    recordFailure,

    check,

    async checkAll(probe) {
      return Promise.all(
        [...registry.keys()].map((exchangeId) =>
          check(exchangeId, probe),
        ),
      );
    },
  };
}
