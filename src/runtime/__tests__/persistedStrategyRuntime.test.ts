import assert from "node:assert/strict";
import test from "node:test";
import { createStrategyPluginRegistry } from "../../strategy/plugin";
import { createDCAStrategyPlugin } from "../../strategy/dca";
import type { PersistedStrategy } from "../../database/repositories/strategyRepository";
import type { RuntimeCompositionRequest } from "../runtimeComposition";
import { createPersistedStrategyRuntimeComposer } from "../persistedStrategyRuntime";

function createPersistedStrategy(
  overrides: Partial<PersistedStrategy> = {},
): PersistedStrategy {
  return {
    id: 1,
    strategy_id: "dca",
    name: "Test DCA",
    balance_mode: "test",
    balance_account_id: "test-account",
    exchange_id: "binance",
    market_type: "spot",
    symbol: "BTCUSDT",
    execution_mode: "maker-only",
    configuration_json: JSON.stringify({
      initialOrder: 100,
      dcaOrders: [{ dropPercent: 1 }],
    }),
    status: "active",
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

test("persisted strategy is composed through the runtime boundary", () => {
  const plugin = createDCAStrategyPlugin();
  const registry = createStrategyPluginRegistry([plugin]);

  let captured: RuntimeCompositionRequest | undefined;

  const runtimeComposer = {
    compose(request: RuntimeCompositionRequest) {
      captured = request;

      return {
        strategy: request.strategy,
        strategyConfiguration: request.strategyConfiguration,
        balanceContext: {
          mode: request.balanceMode,
          accountId: request.balanceAccountId,
        },
        balanceAccount: {} as never,
      };
    },
  };

  const composer = createPersistedStrategyRuntimeComposer({
    strategyPluginRegistry: registry,
    runtimeComposer,
  });

  const persisted = createPersistedStrategy();
  const result = composer.compose(persisted);

  assert.equal(captured?.strategy, plugin);
  assert.equal(captured?.strategyConfiguration.strategyId, "dca");
  assert.equal(captured?.balanceMode, "test");
  assert.equal(captured?.balanceAccountId, "test-account");
  assert.equal(result.strategy, plugin);
});

test("persisted balance mode selects runtime balance mode without changing strategy configuration", () => {
  const plugin = createDCAStrategyPlugin();
  const registry = createStrategyPluginRegistry([plugin]);

  const requests: RuntimeCompositionRequest[] = [];

  const runtimeComposer = {
    compose(request: RuntimeCompositionRequest) {
      requests.push(request);

      return {
        strategy: request.strategy,
        strategyConfiguration: request.strategyConfiguration,
        balanceContext: {
          mode: request.balanceMode,
          accountId: request.balanceAccountId,
        },
        balanceAccount: {} as never,
      };
    },
  };

  const composer = createPersistedStrategyRuntimeComposer({
    strategyPluginRegistry: registry,
    runtimeComposer,
  });

  composer.compose(
    createPersistedStrategy({
      id: 1,
      balance_mode: "live",
      balance_account_id: "live-account",
    }),
  );

  composer.compose(
    createPersistedStrategy({
      id: 2,
      balance_mode: "test",
      balance_account_id: "test-account",
    }),
  );

  assert.deepEqual(
    requests.map((request) => request.balanceMode),
    ["live", "test"],
  );

  assert.deepEqual(
    requests.map((request) => request.strategyConfiguration.strategyId),
    ["dca", "dca"],
  );
});

test("persisted strategy configuration JSON remains strategy-owned", () => {
  const plugin = createDCAStrategyPlugin();
  const registry = createStrategyPluginRegistry([plugin]);

  let receivedConfigurationJson = "";

  const runtimeComposer = {
    compose(request: RuntimeCompositionRequest) {
      receivedConfigurationJson = JSON.stringify(
        request.strategyConfiguration,
      );

      return {
        strategy: request.strategy,
        strategyConfiguration: request.strategyConfiguration,
        balanceContext: {
          mode: request.balanceMode,
          accountId: request.balanceAccountId,
        },
        balanceAccount: {} as never,
      };
    },
  };

  const composer = createPersistedStrategyRuntimeComposer({
    strategyPluginRegistry: registry,
    runtimeComposer,
  });

  const persisted = createPersistedStrategy({
    configuration_json: JSON.stringify({
      initialOrder: 100,
      dcaOrders: [{ dropPercent: 1 }, { dropPercent: 3 }],
      takeProfit: 2,
      stopLoss: 50,
    }),
  });

  composer.compose(persisted);

  assert.equal(
    receivedConfigurationJson,
    JSON.stringify({ strategyId: "dca" }),
  );
});

test("persisted strategy with an unknown plugin fails at composition", () => {
  const registry = createStrategyPluginRegistry();

  const runtimeComposer = {
    compose(request: RuntimeCompositionRequest) {
      throw new Error(`unexpected composition: ${request.strategy.metadata.id}`);
    },
  };

  const composer = createPersistedStrategyRuntimeComposer({
    strategyPluginRegistry: registry,
    runtimeComposer,
  });

  assert.throws(
    () => composer.compose(createPersistedStrategy()),
    /Strategy plugin not registered: dca/,
  );
});
