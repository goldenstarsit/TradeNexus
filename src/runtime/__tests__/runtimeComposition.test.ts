import assert from "node:assert/strict";
import test from "node:test";

import {
  createBalanceAccountProviderRegistry,
  createBalanceContextProvider,
} from "../../balance";
import { createTestBalanceAccountProvider } from "../../balance/testBalanceAccountProvider";
import { createDCAStrategyPlugin, createStrategyConfiguration } from "../../strategy";
import {
  createRuntimeComposer,
  createDefaultRuntimeComposer,
} from "../runtimeComposition";

test("runtime composition combines strategy and balance only at composition level", () => {
  const testProvider = createTestBalanceAccountProvider({
    USDT: 1000,
  });

  const registry = createBalanceAccountProviderRegistry({
    test: testProvider,
  });

  const strategy = createDCAStrategyPlugin();
  const strategyConfiguration = createStrategyConfiguration("dca");

  const runtime = createRuntimeComposer({
    balanceContextProvider: createBalanceContextProvider(),
    balanceAccountProviderRegistry: registry,
  }).compose({
    strategy,
    strategyConfiguration,
    balanceMode: "test",
    balanceAccountId: "account-1",
  });

  assert.equal(runtime.strategy, strategy);
  assert.equal(runtime.strategyConfiguration, strategyConfiguration);
  assert.equal(runtime.balanceContext.mode, "test");
  assert.equal(runtime.balanceContext.accountId, "account-1");
  assert.equal(runtime.balanceAccount.context, runtime.balanceContext);
  assert.equal(runtime.balanceAccount.getBalance("USDT").available, 1000);
});

test("selected balance mode determines the provider without changing strategy configuration", () => {
  const testProvider = createTestBalanceAccountProvider({
    USDT: 500,
  });

  const registry = createBalanceAccountProviderRegistry({
    test: testProvider,
  });

  const configuration = createStrategyConfiguration("dca");
  const strategy = createDCAStrategyPlugin("2.0.0");

  const runtime = createDefaultRuntimeComposer(registry).compose({
    strategy,
    strategyConfiguration: configuration,
    balanceMode: "test",
    balanceAccountId: "test-account",
  });

  assert.equal(runtime.strategyConfiguration.strategyId, "dca");
  assert.equal(runtime.strategy.metadata.version, "2.0.0");
  assert.equal(runtime.balanceContext.mode, "test");
  assert.equal(runtime.balanceAccount.getBalance("USDT").available, 500);
});

test("runtime composition does not modify the strategy configuration", () => {
  const registry = createBalanceAccountProviderRegistry({
    test: createTestBalanceAccountProvider(),
  });

  const configuration = createStrategyConfiguration("dca");

  const runtime = createDefaultRuntimeComposer(registry).compose({
    strategy: createDCAStrategyPlugin(),
    strategyConfiguration: configuration,
    balanceMode: "test",
    balanceAccountId: "account-1",
  });

  assert.equal(runtime.strategyConfiguration, configuration);
  assert.deepEqual(configuration, { strategyId: "dca" });
});

test("composition fails when the selected balance mode has no provider", () => {
  const registry = createBalanceAccountProviderRegistry();

  const composer = createDefaultRuntimeComposer(registry);

  assert.throws(
    () =>
      composer.compose({
        strategy: createDCAStrategyPlugin(),
        strategyConfiguration: createStrategyConfiguration("dca"),
        balanceMode: "test",
        balanceAccountId: "account-1",
      }),
    /No balance account provider registered for test mode/,
  );
});
