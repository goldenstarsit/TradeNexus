import assert from "node:assert/strict";
import test from "node:test";

import {
  depositTestBalance,
  getTestBalance,
  withdrawTestBalance,
} from "../testBalanceService";

test("test balance service creates isolated test accounts", () => {
  depositTestBalance("api-account-a", "USDT", 1000);
  depositTestBalance("api-account-b", "USDT", 500);

  assert.equal(getTestBalance("api-account-a", "USDT").total, 1000);
  assert.equal(getTestBalance("api-account-b", "USDT").total, 500);
});

test("test balance service deposits and withdraws available balance", () => {
  depositTestBalance("api-account-c", "USDT", 1000);

  assert.deepEqual(getTestBalance("api-account-c", "USDT"), {
    asset: "USDT",
    available: 1000,
    reserved: 0,
    total: 1000,
  });

  assert.deepEqual(
    withdrawTestBalance("api-account-c", "USDT", 250),
    {
      asset: "USDT",
      available: 750,
      reserved: 0,
      total: 750,
    },
  );
});

test("test balance service rejects insufficient withdrawal", () => {
  depositTestBalance("api-account-d", "USDT", 100);

  assert.throws(
    () => withdrawTestBalance("api-account-d", "USDT", 101),
    /Insufficient available USDT balance/,
  );
});

test("test balance service rejects invalid account IDs", () => {
  assert.throws(
    () => getTestBalance("   ", "USDT"),
    /Balance account ID must not be empty/,
  );
});
