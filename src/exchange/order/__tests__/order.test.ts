import assert from "node:assert/strict";
import {
  calculateRemainingQuantity,
  createOrder,
  isOrderSide,
  isOrderStatus,
  isOrderTerminal,
  ORDER_SIDES,
  ORDER_STATUSES,
  type Order,
} from "../index";

const now = Date.now();

const order: Order = createOrder({
  id: " order-1 ",
  clientOrderId: " client-1 ",
  exchange: "binance",
  symbol: "btcusdt",
  side: "buy",
  type: "limit",
  status: "partiallyFilled",
  price: 100000,
  quantity: 0.1,
  executedQuantity: 0.04,
  createdAt: now,
  updatedAt: now,
});

assert.equal(order.id, "order-1");
assert.equal(order.clientOrderId, "client-1");
assert.equal(order.symbol, "BTCUSDT");
assert.equal(order.side, "buy");
assert.equal(order.status, "partiallyFilled");
assert.equal(order.remainingQuantity, 0.06);
assert.equal(Object.isFrozen(order), true);

assert.deepEqual(ORDER_SIDES, ["buy", "sell"]);
assert.deepEqual(ORDER_STATUSES, [
  "new",
  "open",
  "partiallyFilled",
  "filled",
  "canceled",
  "rejected",
  "expired",
]);

for (const side of ORDER_SIDES) {
  assert.equal(isOrderSide(side), true);
}

for (const status of ORDER_STATUSES) {
  assert.equal(isOrderStatus(status), true);
}

assert.equal(isOrderSide("unknown"), false);
assert.equal(isOrderStatus("unknown"), false);

assert.equal(
  Math.abs(calculateRemainingQuantity(order.quantity, order.executedQuantity) - 0.06) <
    1e-12,
  true,
);
assert.equal(calculateRemainingQuantity(1, 1), 0);

assert.equal(isOrderTerminal("filled"), true);
assert.equal(isOrderTerminal("canceled"), true);
assert.equal(isOrderTerminal("rejected"), true);
assert.equal(isOrderTerminal("expired"), true);
assert.equal(isOrderTerminal("open"), false);
assert.equal(isOrderTerminal("new"), false);

assert.throws(
  () =>
    createOrder({
      id: "",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      status: "new",
      quantity: 1,
      executedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    }),
  /Order ID cannot be empty/,
);

assert.throws(
  () =>
    createOrder({
      id: "order-2",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      status: "new",
      quantity: 1,
      executedQuantity: 2,
      createdAt: now,
      updatedAt: now,
    }),
  /Executed quantity cannot exceed order quantity/,
);

assert.throws(
  () =>
    createOrder({
      id: "order-3",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      status: "new",
      price: 0,
      quantity: 1,
      executedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    }),
  /Order price must be a finite number greater than zero/,
);

assert.throws(
  () =>
    createOrder({
      id: "order-4",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "hold" as never,
      type: "limit",
      status: "new",
      quantity: 1,
      executedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    }),
  /Unsupported order side: hold/,
);

assert.throws(
  () =>
    createOrder({
      id: "order-5",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      type: "unknown" as never,
      status: "new",
      quantity: 1,
      executedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    }),
  /Unsupported order type: unknown/,
);

assert.throws(
  () =>
    createOrder({
      id: "order-6",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      status: "unknown" as never,
      quantity: 1,
      executedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    }),
  /Unsupported order status: unknown/,
);

assert.throws(
  () =>
    createOrder({
      id: "order-7",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      status: "new",
      quantity: 0,
      executedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    }),
  /Order quantity must be a finite number greater than zero/,
);

assert.throws(() => calculateRemainingQuantity(1, 2), /Executed quantity cannot exceed order quantity/);

console.log("Exchange order model hardening verification: OK");
