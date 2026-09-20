import assert from "node:assert/strict";
import test from "node:test";
import {
  createStrategyConfiguration,
} from "../strategyConfiguration";

test("strategy configuration contains only strategy-owned configuration", () => {
  const configuration = createStrategyConfiguration("dca-btc");

  assert.equal(configuration.strategyId, "dca-btc");
  assert.equal("balanceMode" in configuration, false);
  assert.equal("balanceContext" in configuration, false);
});

test("strategy configuration normalizes strategy ID", () => {
  const configuration = createStrategyConfiguration("  dca-btc  ");

  assert.equal(configuration.strategyId, "dca-btc");
});

test("empty strategy IDs are rejected", () => {
  assert.throws(
    () => createStrategyConfiguration("   "),
    /Strategy ID must not be empty/,
  );
});

test("strategy configuration is immutable", () => {
  const configuration = createStrategyConfiguration("strategy-1");

  assert.equal(Object.isFrozen(configuration), true);
});
