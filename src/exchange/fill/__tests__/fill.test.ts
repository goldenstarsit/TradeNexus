import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAverageFillPrice,
  calculateQuoteQuantity,
  createFill,
  isFillSide,
  type Fill,
} from "../index";

test("fill factory normalizes and freezes fill", () => {
  const fill = createFill({
    id: " fill-1 ",
    orderId: " order-1 ",
    exchange: " binance ",
    symbol: " btcusdt ",
    side: "buy",
    price: 100000,
    quantity: 0.01,
    fee: 0.001,
    feeAsset: " btc ",
    timestamp: 123456,
  });

  assert.equal(fill.id, "fill-1");
  assert.equal(fill.orderId, "order-1");
  assert.equal(fill.exchange, "binance");
  assert.equal(fill.symbol, "BTCUSDT");
  assert.equal(fill.side, "buy");
  assert.equal(fill.price, 100000);
  assert.equal(fill.quantity, 0.01);
  assert.equal(fill.quoteQuantity, 1000);
  assert.equal(fill.fee, 0.001);
  assert.equal(fill.feeAsset, "BTC");
  assert.equal(Object.isFrozen(fill), true);
});

test("fill factory validates quote quantity", () => {
  assert.equal(
    createFill({
      id: "fill-1",
      orderId: "order-1",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      price: 100000,
      quantity: 0.01,
      quoteQuantity: 1000,
      fee: 0,
      feeAsset: "USDT",
      timestamp: 1,
    }).quoteQuantity,
    1000,
  );

  assert.throws(
    () =>
      createFill({
        id: "fill-1",
        orderId: "order-1",
        exchange: "binance",
        symbol: "BTCUSDT",
        side: "buy",
        price: 100000,
        quantity: 0.01,
        quoteQuantity: 999,
        fee: 0,
        feeAsset: "USDT",
        timestamp: 1,
      }),
    /Quote quantity does not match price and quantity/,
  );
});

test("fill factory rejects invalid fields", () => {
  assert.throws(
    () =>
      createFill({
        id: "   ",
        orderId: "order-1",
        exchange: "binance",
        symbol: "BTCUSDT",
        side: "buy",
        price: 100000,
        quantity: 0.01,
        fee: 0,
        feeAsset: "BTC",
        timestamp: 1,
      }),
    /Fill ID cannot be empty/,
  );

  assert.throws(
    () =>
      createFill({
        id: "fill-1",
        orderId: "order-1",
        exchange: "binance",
        symbol: "BTCUSDT",
        side: "buy",
        price: -1,
        quantity: 0.01,
        fee: 0,
        feeAsset: "BTC",
        timestamp: 1,
      }),
    /Fill price must be a finite non-negative number/,
  );

  assert.throws(
    () =>
      createFill({
        id: "fill-1",
        orderId: "order-1",
        exchange: "binance",
        symbol: "BTCUSDT",
        side: "hold" as never,
        price: 100,
        quantity: 1,
        fee: 0,
        feeAsset: "USDT",
        timestamp: 1,
      }),
    /Unsupported fill side/,
  );
});

test("fill side guard recognizes supported sides", () => {
  assert.equal(isFillSide("buy"), true);
  assert.equal(isFillSide("sell"), true);
  assert.equal(isFillSide("hold"), false);
});

test("fill calculations preserve average price behavior", () => {
  const fills: Fill[] = [
    createFill({
      id: "fill-1",
      orderId: "order-1",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      price: 100000,
      quantity: 0.01,
      fee: 0.001,
      feeAsset: "BTC",
      timestamp: 1,
    }),
    createFill({
      id: "fill-2",
      orderId: "order-1",
      exchange: "binance",
      symbol: "BTCUSDT",
      side: "buy",
      price: 101000,
      quantity: 0.02,
      fee: 0.002,
      feeAsset: "BTC",
      timestamp: 2,
    }),
  ];

  assert.equal(calculateQuoteQuantity(100000, 0.01), 1000);
  assert.ok(
    Math.abs(
      calculateAverageFillPrice(fills) - 100666.66666666667,
    ) < 1e-10,
  );
  assert.equal(calculateAverageFillPrice([]), 0);
  assert.equal(calculateQuoteQuantity(0, 2), 0);
});
