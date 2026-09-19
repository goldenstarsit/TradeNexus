import assert from "node:assert/strict";
import test from "node:test";
import { createFill } from "../../fill/fill";
import {
  calculateExecutionAveragePrice,
  calculateExecutionFees,
  createOrderExecutionResult,
} from "../orderExecutionResult";

function fill(
  id: string,
  price: number,
  quantity: number,
  fee: number,
  feeAsset = "USDT",
) {
  return createFill({
    id,
    orderId: "order-1",
    exchange: "MEXC",
    symbol: "BTCUSDT",
    side: "buy",
    price,
    quantity,
    fee,
    feeAsset,
    timestamp: 1000,
  });
}

test("maker, taker and hybrid use the same execution result shape", () => {
  const base = {
    orderId: "order-1",
    exchange: "MEXC",
    symbol: "BTCUSDT",
    side: "buy" as const,
    status: "filled" as const,
    requestedQuantity: 0.01,
    fills: [fill("fill-1", 100, 0.01, 0.001)],
    createdAt: 1000,
    executedAt: 1001,
    updatedAt: 1001,
  };

  const maker = createOrderExecutionResult({
    ...base,
    executionMode: "makerOnly",
    executionType: "maker",
  });

  const taker = createOrderExecutionResult({
    ...base,
    executionMode: "takerOnly",
    executionType: "taker",
  });

  const hybrid = createOrderExecutionResult({
    ...base,
    executionMode: "hybrid",
    executionType: "maker",
  });

  for (const result of [maker, taker, hybrid]) {
    assert.equal(result.executedQuantity, 0.01);
    assert.equal(result.remainingQuantity, 0);
    assert.equal(result.averagePrice, 100);
    assert.equal(result.quoteQuantity, 1);
    assert.deepEqual(result.fee, [{ amount: 0.001, asset: "USDT" }]);
    assert.equal(result.fills.length, 1);
  }
});

test("fees are aggregated by fee asset for audit", () => {
  const fills = [
    fill("fill-1", 100, 0.01, 0.001, "USDT"),
    fill("fill-2", 110, 0.01, 0.002, "USDT"),
    fill("fill-3", 120, 0.01, 0.0001, "BTC"),
  ];

  assert.deepEqual(calculateExecutionFees(fills), [
    { amount: 0.0001, asset: "BTC" },
    { amount: 0.003, asset: "USDT" },
  ]);
});

test("average execution price is calculated from fills", () => {
  const fills = [
    fill("fill-1", 100, 1, 0),
    fill("fill-2", 120, 3, 0),
  ];

  assert.equal(calculateExecutionAveragePrice(fills), 115);
});

test("hybrid records successful taker fallback", () => {
  const result = createOrderExecutionResult({
    orderId: "order-2",
    exchange: "MEXC",
    symbol: "BTCUSDT",
    side: "buy",
    executionMode: "hybrid",
    executionType: "taker",
    status: "filled",
    requestedQuantity: 0.01,
    fills: [fill("fill-2", 101, 0.01, 0.001)],
    attempts: [
      {
        type: "maker",
        status: "failed",
        reason: "Maker order could not be achieved",
        timestamp: 1000,
      },
      {
        type: "taker",
        status: "success",
        orderId: "order-2",
        timestamp: 1001,
      },
    ],
    createdAt: 1000,
    executedAt: 1002,
    updatedAt: 1002,
  });

  assert.equal(result.executionType, "taker");
  assert.equal(result.takerFallbackUsed, true);
});

test("makerOnly rejects taker result", () => {
  assert.throws(
    () =>
      createOrderExecutionResult({
        exchange: "MEXC",
        symbol: "BTCUSDT",
        side: "buy",
        executionMode: "makerOnly",
        executionType: "taker",
        status: "filled",
        requestedQuantity: 0.01,
        fills: [],
        createdAt: 1000,
        updatedAt: 1000,
      }),
    /makerOnly execution cannot produce a taker result/,
  );
});

test("execution result is immutable", () => {
  const result = createOrderExecutionResult({
    exchange: "MEXC",
    symbol: "BTCUSDT",
    side: "buy",
    executionMode: "makerOnly",
    executionType: "maker",
    status: "filled",
    requestedQuantity: 0.01,
    fills: [fill("fill-1", 100, 0.01, 0.001)],
    createdAt: 1000,
    updatedAt: 1000,
  });

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.fee), true);
  assert.equal(Object.isFrozen(result.fills), true);
});

test("preserves exchange order lifecycle status", () => {
  const result = createOrderExecutionResult({
    exchange: "MEXC",
    symbol: "BTCUSDT",
    side: "buy",
    executionMode: "makerOnly",
    executionType: "maker",
    status: "failed",
    orderStatus: "partiallyFilled",
    requestedQuantity: 0.01,
    fills: [],
    reportedExecutedQuantity: 0.004,
    createdAt: 1000,
    updatedAt: 1001,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.orderStatus, "partiallyFilled");
  assert.equal(result.executedQuantity, 0.004);
  assert.equal(Object.isFrozen(result), true);
});

test("rejects unsupported exchange order lifecycle status", () => {
  assert.throws(
    () =>
      createOrderExecutionResult({
        exchange: "MEXC",
        symbol: "BTCUSDT",
        side: "buy",
        executionMode: "makerOnly",
        executionType: "maker",
        status: "failed",
        orderStatus: "unsupported" as never,
        requestedQuantity: 0.01,
        fills: [],
        createdAt: 1000,
        updatedAt: 1000,
      }),
    /Unsupported order status: unsupported/,
  );
});

test("preserves filled lifecycle status independently from execution result status", () => {
  const result = createOrderExecutionResult({
    exchange: "MEXC",
    symbol: "BTCUSDT",
    side: "buy",
    executionMode: "makerOnly",
    executionType: "maker",
    status: "filled",
    orderStatus: "filled",
    requestedQuantity: 0.01,
    fills: [fill("fill-status-1", 100, 0.01, 0.001)],
    createdAt: 1000,
    executedAt: 1001,
    updatedAt: 1001,
  });

  assert.equal(result.status, "filled");
  assert.equal(result.orderStatus, "filled");
  assert.equal(result.executedQuantity, 0.01);
});
