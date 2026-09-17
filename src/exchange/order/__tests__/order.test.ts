import assert from "node:assert/strict";
import {
  calculateRemainingQuantity,
  isOrderTerminal,
  type Order,
 } from "../index";

const now = Date.now();
const order: Order = {
  id: "order-1",
  clientOrderId: "client-1",
  exchange: "binance",
  symbol: "BTCUSDT",
  side: "buy",
  type: "limit",
  status: "partiallyFilled",
  price: 100000,
  quantity: 0.1,
  executedQuantity: 0.04,
  remainingQuantity: 0.06,
  createdAt: now,
  updatedAt: now,
};

assert.equal(order.side, "buy");
assert.equal(order.status, "partiallyFilled");
assert.ok(Math.abs(calculateRemainingQuantity(order.quantity, order.executedQuantity) - 0.06) < 1e-12);
assert.equal(calculateRemainingQuantity(1, 2), 0);
assert.equal(isOrderTerminal("filled"), true);
assert.equal(isOrderTerminal("canceled"), true);
assert.equal(isOrderTerminal("open"), false);
assert.equal(isOrderTerminal("new"), false);

console.log("M32 order model verification: OK");
