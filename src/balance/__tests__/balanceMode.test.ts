import assert from "node:assert/strict";
import test from "node:test";
import {
  BALANCE_MODES,
  isBalanceMode,
  type BalanceMode,
} from "../balanceMode";

test("strategy balance modes expose live and test modes", () => {
  assert.deepEqual(BALANCE_MODES, ["live", "test"]);
});

test("strategy balance mode validation accepts live and test", () => {
  assert.equal(isBalanceMode("live"), true);
  assert.equal(isBalanceMode("test"), true);
  assert.equal(isBalanceMode("LIVE"), false);
  assert.equal(isBalanceMode("unknown"), false);
});

test("balance mode is strongly typed", () => {
  const live: BalanceMode = "live";
  const testMode: BalanceMode = "test";

  assert.equal(live, "live");
  assert.equal(testMode, "test");
});
