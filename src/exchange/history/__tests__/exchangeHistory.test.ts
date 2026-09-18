import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrderHistoryQuery,
  createTradeHistoryQuery,
  type ExchangeOrderHistoryClient,
  type ExchangeTradeHistoryClient,
} from "../exchangeHistory";
import type { Order } from "../../order/order";
import type { Fill } from "../../fill/fill";

test("normalizes order history query", () => {
  const query = createOrderHistoryQuery({
    symbol: " btcusdt ",
    orderId: " 123 ",
    clientOrderId: " client-1 ",
    startTime: 100,
    endTime: 200,
    limit: 50,
    statuses: ["open", "filled"],
  });

  assert.equal(query.symbol, "BTCUSDT");
  assert.equal(query.orderId, "123");
  assert.equal(query.clientOrderId, "client-1");
  assert.equal(query.startTime, 100);
  assert.equal(query.endTime, 200);
  assert.equal(query.limit, 50);
  assert.deepEqual(query.statuses, ["open", "filled"]);
  assert.equal(Object.isFrozen(query), true);
  assert.equal(Object.isFrozen(query.statuses), true);
});

test("normalizes trade history query", () => {
  const query = createTradeHistoryQuery({
    symbol: " ethusdt ",
    orderId: " 456 ",
    startTime: 10,
    endTime: 20,
    limit: 25,
  });

  assert.deepEqual(query, {
    symbol: "ETHUSDT",
    orderId: "456",
    startTime: 10,
    endTime: 20,
    limit: 25,
  });
  assert.equal(Object.isFrozen(query), true);
});

test("rejects invalid history ranges and limits", () => {
  assert.throws(
    () => createOrderHistoryQuery({ startTime: 20, endTime: 10 }),
    /Start time cannot be greater than end time/,
  );

  assert.throws(
    () => createTradeHistoryQuery({ limit: 0 }),
    /Limit must be a positive integer/,
  );

  assert.throws(
    () => createOrderHistoryQuery({ symbol: "   " }),
    /Symbol cannot be empty/,
  );
});

test("contracts are compatible with normalized Order and Fill models", async () => {
  const order = {} as Order;
  const fill = {} as Fill;

  const orderClient: ExchangeOrderHistoryClient = {
    async getOrderHistory() {
      return [order];
    },
  };

  const tradeClient: ExchangeTradeHistoryClient = {
    async getTradeHistory() {
      return [fill];
    },
  };

  assert.deepEqual(await orderClient.getOrderHistory(), [order]);
  assert.deepEqual(await tradeClient.getTradeHistory(), [fill]);
});
