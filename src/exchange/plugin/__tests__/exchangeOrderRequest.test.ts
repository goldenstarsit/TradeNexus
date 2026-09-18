import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeOrderRequest,
  type ExchangeOrderRequest,
} from "../exchangeOrderRequest";

test("creates normalized immutable exchange order request", () => {
  const request: ExchangeOrderRequest = createExchangeOrderRequest({
    symbol: " btcusdt ",
    side: "buy",
    type: "limit",
    quantity: 0.001,
    price: 100000,
    clientOrderId: " client-1 ",
  });

  assert.deepEqual(request, {
    symbol: "BTCUSDT",
    side: "buy",
    type: "limit",
    quantity: 0.001,
    price: 100000,
    clientOrderId: "client-1",
  });

  assert.equal(Object.isFrozen(request), true);
});

test("supports stop-market and stop-limit requests", () => {
  assert.equal(
    createExchangeOrderRequest({
      symbol: "BTCUSDT",
      side: "sell",
      type: "stopMarket",
      quantity: 0.001,
      stopPrice: 99000,
    }).stopPrice,
    99000,
  );

  assert.equal(
    createExchangeOrderRequest({
      symbol: "BTCUSDT",
      side: "sell",
      type: "stopLimit",
      quantity: 0.001,
      price: 98900,
      stopPrice: 99000,
    }).price,
    98900,
  );
});

test("rejects invalid structural values", () => {
  assert.throws(
    () =>
      createExchangeOrderRequest({
        symbol: "BTCUSDT",
        side: "buy",
        type: "limit",
        quantity: 0,
        price: 100000,
      }),
    /Quantity must be a finite number greater than zero/,
  );

  assert.throws(
    () =>
      createExchangeOrderRequest({
        symbol: "BTCUSDT",
        side: "buy",
        type: "limit",
        quantity: 0.001,
        price: 0,
      }),
    /Price must be a finite number greater than zero/,
  );

  assert.throws(
    () =>
      createExchangeOrderRequest({
        symbol: "BTCUSDT",
        side: "buy",
        type: "limit",
        quantity: 0.001,
        price: 100000,
        clientOrderId: " ",
      }),
    /Client order ID cannot be empty/,
  );
});

test("rejects unsupported runtime side and order type", () => {
  assert.throws(
    () =>
      createExchangeOrderRequest({
        symbol: "BTCUSDT",
        side: "hold" as never,
        type: "limit",
        quantity: 0.001,
        price: 100000,
      }),
    /Unsupported order side: hold/,
  );

  assert.throws(
    () =>
      createExchangeOrderRequest({
        symbol: "BTCUSDT",
        side: "buy",
        type: "unknown" as never,
        quantity: 0.001,
        price: 100000,
      }),
    /Unsupported order type: unknown/,
  );
});
