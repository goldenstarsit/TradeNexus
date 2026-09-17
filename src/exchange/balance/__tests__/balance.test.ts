import assert from "node:assert/strict";
import {
  findBalance,
  getAvailableBalance,
  getTotalBalance,
  type BalanceSnapshot,
 } from "../index";

const snapshot: BalanceSnapshot = {
  exchange: "binance",
  balances: [
    { asset: "USDT", free: 1000, locked: 250 },
    { asset: "BTC", free: 0.25, locked: 0.05 },
  ],
  timestamp: Date.now(),
};

const usdt = findBalance(snapshot, "usdt");
assert.ok(usdt);
assert.equal(getAvailableBalance(usdt), 1000);
assert.equal(getTotalBalance(usdt), 1250);
assert.equal(findBalance(snapshot, "ETH"), undefined);
assert.equal(getTotalBalance(snapshot.balances[1]), 0.3);

console.log("M31 balance contract verification: OK");
