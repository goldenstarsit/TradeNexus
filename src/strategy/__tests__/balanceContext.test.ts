import assert from "node:assert/strict";
import test from "node:test";
import {
  createBalanceContextProvider,
} from "../balanceContext";

test("balance context preserves live mode", () => {
  const provider = createBalanceContextProvider();
  const context = provider.getContext("binance-live", "live");

  assert.equal(context.mode, "live");
  assert.equal(context.accountId, "binance-live");
});

test("balance context preserves test mode", () => {
  const provider = createBalanceContextProvider();
  const context = provider.getContext("binance-test", "test");

  assert.equal(context.mode, "test");
  assert.equal(context.accountId, "binance-test");
});

test("live and test contexts remain independent", () => {
  const provider = createBalanceContextProvider();

  const live = provider.getContext("account-a", "live");
  const testMode = provider.getContext("account-a", "test");

  assert.notEqual(live, testMode);
  assert.equal(live.mode, "live");
  assert.equal(testMode.mode, "test");
  assert.equal(live.accountId, testMode.accountId);
});

test("empty balance account IDs are rejected", () => {
  const provider = createBalanceContextProvider();

  assert.throws(
    () => provider.getContext("   ", "live"),
    /Balance account ID must not be empty/,
  );
});

test("balance contexts are immutable", () => {
  const provider = createBalanceContextProvider();
  const context = provider.getContext("account-a", "test");

  assert.equal(Object.isFrozen(context), true);
});
