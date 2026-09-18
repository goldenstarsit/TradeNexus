import test from "node:test";
import assert from "node:assert/strict";
import {
  createBalance,
  createBalanceSnapshot,
  findBalance,
  getAvailableBalance,
  getTotalBalance,
  type BalanceSnapshot,
} from "../index";

test("balance factory normalizes and freezes balance", () => {
  const balance = createBalance({
    asset: " usdt ",
    free: 1000,
    locked: 250,
  });

  assert.equal(balance.asset, "USDT");
  assert.equal(balance.free, 1000);
  assert.equal(balance.locked, 250);
  assert.equal(Object.isFrozen(balance), true);
  assert.equal(getAvailableBalance(balance), 1000);
  assert.equal(getTotalBalance(balance), 1250);
});

test("balance factory rejects invalid values", () => {
  assert.throws(
    () => createBalance({ asset: "   ", free: 100, locked: 0 }),
    /Asset cannot be empty/,
  );

  assert.throws(
    () => createBalance({ asset: "USDT", free: -1, locked: 0 }),
    /Free balance must be a finite non-negative number/,
  );

  assert.throws(
    () => createBalance({ asset: "USDT", free: 100, locked: Number.NaN }),
    /Locked balance must be a finite non-negative number/,
  );
});

test("balance snapshot factory normalizes and freezes nested balances", () => {
  const snapshot = createBalanceSnapshot({
    exchange: " binance ",
    balances: [
      { asset: " usdt ", free: 1000, locked: 250 },
      { asset: " btc ", free: 0.25, locked: 0.05 },
    ],
    timestamp: 123456,
  });

  assert.equal(snapshot.exchange, "binance");
  assert.equal(snapshot.timestamp, 123456);
  assert.equal(snapshot.balances.length, 2);
  assert.equal(snapshot.balances[0].asset, "USDT");
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.balances), true);
  assert.equal(Object.isFrozen(snapshot.balances[0]), true);
});

test("balance snapshot rejects duplicates and invalid values", () => {
  assert.throws(
    () =>
      createBalanceSnapshot({
        exchange: "binance",
        balances: [
          { asset: "USDT", free: 100, locked: 0 },
          { asset: " usdt ", free: 200, locked: 0 },
        ],
        timestamp: 1,
      }),
    /Duplicate balance assets are not allowed/,
  );

  assert.throws(
    () =>
      createBalanceSnapshot({
        exchange: "binance",
        balances: [],
        timestamp: -1,
      }),
    /Timestamp must be a finite non-negative number/,
  );
});

test("balance lookup is normalized and preserves helper behavior", () => {
  const snapshot: BalanceSnapshot = createBalanceSnapshot({
    exchange: "binance",
    balances: [
      { asset: "USDT", free: 1000, locked: 250 },
      { asset: "BTC", free: 0.25, locked: 0.05 },
    ],
    timestamp: Date.now(),
  });

  const usdt = findBalance(snapshot, " usdt ");
  assert.ok(usdt);
  assert.equal(getAvailableBalance(usdt), 1000);
  assert.equal(getTotalBalance(usdt), 1250);
  assert.equal(findBalance(snapshot, "ETH"), undefined);
  assert.equal(getTotalBalance(snapshot.balances[1]), 0.3);
});
