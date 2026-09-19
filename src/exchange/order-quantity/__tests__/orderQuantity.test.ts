import assert from "node:assert/strict";
import test from "node:test";
import { resolveOrderQuantity } from "../orderQuantity";
import type { SymbolRules } from "../../symbol-rules/symbolRules";

const rules: SymbolRules = Object.freeze({
  symbol: "BTCUSDT",
  priceTickSize: 0.01,
  quantityStepSize: 0.001,
  minQuantity: 0.001,
  maxQuantity: 1,
  minNotional: 10,
  maxNotional: 1000,
});

test("uses explicitly requested quantity unchanged", () => {
  const result = resolveOrderQuantity({
    side: "buy",
    requestedQuantity: 0.123456,
    availableBalance: 100,
    referencePrice: 100,
    rules,
  });

  assert.equal(result.quantity, 0.123456);
  assert.equal(result.source, "requested");
});

test("BUY default quantity satisfies minimum quantity and minimum notional", () => {
  const result = resolveOrderQuantity({
    side: "buy",
    availableBalance: 100,
    referencePrice: 100,
    rules,
  });

  assert.equal(result.quantity, 0.1);
  assert.equal(result.source, "exchangeDefault");
});

test("BUY default quantity rounds upward to the valid quantity step", () => {
  const result = resolveOrderQuantity({
    side: "buy",
    availableBalance: 100,
    referencePrice: 333,
    rules: Object.freeze({
      ...rules,
      minNotional: 10.01,
    }),
  });

  assert.equal(result.quantity, 0.031);
});

test("BUY default quantity rejects insufficient quote balance", () => {
  assert.throws(
    () =>
      resolveOrderQuantity({
        side: "buy",
        availableBalance: 9,
        referencePrice: 100,
        rules,
      }),
    /Insufficient available quote balance/,
  );
});

test("SELL default quantity uses maximum available portfolio quantity", () => {
  const result = resolveOrderQuantity({
    side: "sell",
    availableBalance: 0.4567,
    referencePrice: 100,
    rules,
  });

  assert.equal(result.quantity, 0.456);
  assert.equal(result.source, "exchangeDefault");
});

test("SELL default quantity respects exchange maximum quantity", () => {
  const result = resolveOrderQuantity({
    side: "sell",
    availableBalance: 2,
    referencePrice: 100,
    rules,
  });

  assert.equal(result.quantity, 1);
});

test("SELL default quantity respects exchange maximum notional", () => {
  const result = resolveOrderQuantity({
    side: "sell",
    availableBalance: 2,
    referencePrice: 100,
    rules: Object.freeze({
      ...rules,
      maxNotional: 75,
    }),
  });

  assert.equal(result.quantity, 0.75);
});

test("SELL default quantity rejects a portfolio balance below minimum quantity", () => {
  assert.throws(
    () =>
      resolveOrderQuantity({
        side: "sell",
        availableBalance: 0.0005,
        referencePrice: 100,
        rules,
      }),
    /minimum SELL quantity/,
  );
});

test("default BUY requires a reference price", () => {
  assert.throws(
    () =>
      resolveOrderQuantity({
        side: "buy",
        availableBalance: 100,
        rules,
      }),
    /Reference price/,
  );
});

test("default SELL requires a reference price when minimum notional must be checked", () => {
  assert.throws(
    () =>
      resolveOrderQuantity({
        side: "sell",
        availableBalance: 1,
        rules,
      }),
    /Reference price is required/,
  );
});
