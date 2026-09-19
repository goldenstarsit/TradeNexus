import assert from "node:assert/strict";
import test from "node:test";
import {
  createStrategyConfiguration,
} from "../strategyConfiguration";
import { createBalanceContextProvider } from "../balanceContext";

test("strategy configuration carries its live balance context", () => {
  const provider = createBalanceContextProvider();
  const context = provider.getContext("binance-live", "live");
  const configuration = createStrategyConfiguration("dca-btc-live", context);

  assert.equal(configuration.strategyId, "dca-btc-live");
  assert.equal(configuration.balanceMode, "live");
  assert.equal(configuration.balanceContext, context);
});

test("strategy configuration carries its test balance context", () => {
  const provider = createBalanceContextProvider();
  const context = provider.getContext("binance-test", "test");
  const configuration = createStrategyConfiguration("dca-btc-test", context);

  assert.equal(configuration.strategyId, "dca-btc-test");
  assert.equal(configuration.balanceMode, "test");
  assert.equal(configuration.balanceContext, context);
});

test("live and test strategies can coexist independently", () => {
  const provider = createBalanceContextProvider();

  const live = createStrategyConfiguration(
    "dca-live",
    provider.getContext("account-1", "live"),
  );

  const testMode = createStrategyConfiguration(
    "dca-test",
    provider.getContext("account-1", "test"),
  );

  assert.equal(live.balanceMode, "live");
  assert.equal(testMode.balanceMode, "test");
  assert.notEqual(live.balanceContext, testMode.balanceContext);
  assert.equal(live.balanceContext.accountId, testMode.balanceContext.accountId);
});

test("empty strategy IDs are rejected", () => {
  const provider = createBalanceContextProvider();
  const context = provider.getContext("account-1", "test");

  assert.throws(
    () => createStrategyConfiguration("   ", context),
    /Strategy ID must not be empty/,
  );
});

test("strategy configuration is immutable", () => {
  const provider = createBalanceContextProvider();
  const context = provider.getContext("account-1", "live");
  const configuration = createStrategyConfiguration("strategy-1", context);

  assert.equal(Object.isFrozen(configuration), true);
});
