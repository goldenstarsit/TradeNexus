import assert from "node:assert/strict";
import test from "node:test";
import { createOrderExecutionResult } from "../orderExecutionResult";
import type { Fill } from "../../fill/fill";

const exchangeFills: Fill[] = [
  {
    id: "mexc-fill-1",
    orderId: "mexc-order-1",
    exchange: "mexc",
    symbol: "BTCUSDT",
    side: "buy",
    price: 100000,
    quantity: 0.001,
    quoteQuantity: 100,
    fee: 0.000001,
    feeAsset: "BTC",
    timestamp: 1700000001234,
  },
  {
    id: "binance-fill-1",
    orderId: "binance-order-1",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    price: 100010,
    quantity: 0.0005,
    quoteQuantity: 50.005,
    fee: 0.05,
    feeAsset: "USDT",
    timestamp: 1700000002234,
  },
  {
    id: "htx-fill-1",
    orderId: "htx-order-1",
    exchange: "htx",
    symbol: "BTCUSDT",
    side: "buy",
    price: 100020,
    quantity: 0.0005,
    quoteQuantity: 50.01,
    fee: 0.0000005,
    feeAsset: "BTC",
    timestamp: 1700000003234,
  },
];

test("exchange-mapped fills aggregate into one execution result", () => {
  const result = createOrderExecutionResult({
    orderId: "aggregate-order-1",
    exchange: "mexc",
    symbol: "BTCUSDT",
    side: "buy",
    executionMode: "hybrid",
    executionType: "maker",
    status: "filled",
    requestedQuantity: 0.002,
    fills: exchangeFills,
    attempts: [
      {
        type: "maker",
        status: "success",
        orderId: "aggregate-order-1",
        timestamp: 1700000000000,
      },
    ],
    createdAt: 1700000000000,
    executedAt: 1700000003234,
    updatedAt: 1700000003234,
  });

  assert.equal(result.executedQuantity, 0.002);
  assert.equal(result.remainingQuantity, 0);
  assert.equal(result.quoteQuantity, 200.015);
  assert.ok(Math.abs(result.averagePrice - 100007.5) < 1e-9);

  assert.deepEqual(result.fee, [
    { amount: 0.0000015, asset: "BTC" },
    { amount: 0.05, asset: "USDT" },
  ]);

  assert.equal(result.fills.length, 3);
  assert.equal(result.takerFallbackUsed, false);
});

test("partial exchange fills preserve remaining quantity", () => {
  const result = createOrderExecutionResult({
    orderId: "partial-order-1",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    executionMode: "makerOnly",
    executionType: "maker",
    status: "partiallyFilled",
    requestedQuantity: 0.002,
    fills: [exchangeFills[0]],
    createdAt: 1700000000000,
    updatedAt: 1700000001234,
  });

  assert.equal(result.executedQuantity, 0.001);
  assert.equal(result.remainingQuantity, 0.001);
  assert.equal(result.averagePrice, 100000);
  assert.equal(result.quoteQuantity, 100);
});

console.log("Exchange fill -> execution result integration contract: OK");
