import test from "node:test";
import assert from "node:assert/strict";
import { validateOrderRequest } from "../index";
import type { SymbolRules } from "../../symbol-rules/symbolRules";

const rules: SymbolRules = Object.freeze({
  symbol: "BTCUSDT",
  priceTickSize: 0.01,
  quantityStepSize: 0.001,
  minQuantity: 0.001,
  maxQuantity: 10,
  minNotional: 10,
});

test("valid limit order passes and result is immutable", () => {
  const result = validateOrderRequest(
    {
      symbol: " btCUSDT ",
      side: "buy",
      type: "limit",
      quantity: 0.01,
      price: 100000,
    },
    rules,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.errors), true);
});

test("invalid side and type are rejected at runtime", () => {
  const result = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "hold" as never,
      type: "unknown" as never,
      quantity: 0.01,
    },
    rules,
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Unsupported order side")));
  assert.ok(result.errors.some((error) => error.includes("Unsupported order type")));
});

test("price requirements are enforced", () => {
  const missingPrice = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 0.01,
    },
    rules,
  );

  assert.equal(missingPrice.valid, false);
  assert.ok(
    missingPrice.errors.includes(
      "Price is required and must be greater than zero",
    ),
  );

  const marketWithPrice = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "market",
      quantity: 0.01,
      price: 100000,
    },
    rules,
  );

  assert.equal(marketWithPrice.valid, false);
  assert.ok(
    marketWithPrice.errors.includes(
      "Price is not allowed for this order type",
    ),
  );
});

test("stop price requirements are enforced", () => {
  const missingStop = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "sell",
      type: "stopMarket",
      quantity: 0.01,
    },
    rules,
  );

  assert.equal(missingStop.valid, false);
  assert.ok(
    missingStop.errors.includes(
      "Stop price is required and must be greater than zero",
    ),
  );

  const limitWithStop = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 0.01,
      price: 100000,
      stopPrice: 99000,
    },
    rules,
  );

  assert.equal(limitWithStop.valid, false);
  assert.ok(
    limitWithStop.errors.includes(
      "Stop price is not allowed for this order type",
    ),
  );
});

test("quantity and tick-size rules are enforced", () => {
  const invalidQuantity = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "market",
      quantity: 0.0005,
    },
    rules,
  );

  assert.equal(invalidQuantity.valid, false);

  const invalidStep = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 0.0015,
      price: 100000,
    },
    rules,
  );

  assert.equal(invalidStep.valid, false);
  assert.ok(
    invalidStep.errors.includes("Quantity violates symbol rules"),
  );

  const invalidTick = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 0.01,
      price: 100000.005,
    },
    rules,
  );

  assert.equal(invalidTick.valid, false);
  assert.ok(
    invalidTick.errors.includes("Price violates price tick size"),
  );
});

test("notional limits are enforced when executable price exists", () => {
  const invalidNotional = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 0.001,
      price: 100,
    },
    rules,
  );

  assert.equal(invalidNotional.valid, false);
  assert.ok(
    invalidNotional.errors.includes(
      "Order notional violates symbol rules",
    ),
  );
});

test("symbol validation rejects empty and mismatched symbols", () => {
  const empty = validateOrderRequest(
    {
      symbol: "   ",
      side: "buy",
      type: "market",
      quantity: 0.01,
    },
    rules,
  );

  assert.equal(empty.valid, false);
  assert.ok(empty.errors.includes("Symbol cannot be empty"));

  const mismatch = validateOrderRequest(
    {
      symbol: "ETHUSDT",
      side: "buy",
      type: "market",
      quantity: 0.01,
    },
    rules,
  );

  assert.equal(mismatch.valid, false);
  assert.ok(
    mismatch.errors.includes("Symbol does not match symbol rules"),
  );
});

test("maximum quantity and maximum notional rules are enforced", () => {
  const limitedRules: SymbolRules = Object.freeze({
    ...rules,
    maxQuantity: 1,
    maxNotional: 500,
  });

  const excessiveQuantity = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 2,
      price: 100,
    },
    limitedRules,
  );

  assert.equal(excessiveQuantity.valid, false);
  assert.ok(
    excessiveQuantity.errors.includes("Quantity violates symbol rules"),
  );

  const excessiveNotional = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 1,
      price: 600,
    },
    limitedRules,
  );

  assert.equal(excessiveNotional.valid, false);
  assert.ok(
    excessiveNotional.errors.includes(
      "Order notional violates symbol rules",
    ),
  );
});

test("stop-limit validates both executable price and stop price", () => {
  const invalid = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "sell",
      type: "stopLimit",
      quantity: 0.01,
      price: 100000.005,
      stopPrice: 99000.005,
    },
    rules,
  );

  assert.equal(invalid.valid, false);
  assert.ok(
    invalid.errors.includes("Price violates price tick size"),
  );
  assert.ok(
    invalid.errors.includes("Stop price violates price tick size"),
  );
});

test("maker-only order requires price and rejects stop price", () => {
  const missingPrice = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "makerOnly",
      quantity: 0.01,
    },
    rules,
  );

  assert.equal(missingPrice.valid, false);
  assert.ok(
    missingPrice.errors.includes(
      "Price is required and must be greater than zero",
    ),
  );

  const withStopPrice = validateOrderRequest(
    {
      symbol: "BTCUSDT",
      side: "buy",
      type: "makerOnly",
      quantity: 0.01,
      price: 100000,
      stopPrice: 99000,
    },
    rules,
  );

  assert.equal(withStopPrice.valid, false);
  assert.ok(
    withStopPrice.errors.includes(
      "Stop price is not allowed for this order type",
    ),
  );
});

