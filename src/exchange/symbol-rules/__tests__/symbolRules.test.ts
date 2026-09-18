import assert from "node:assert/strict";
import test from "node:test";

import {
  createSymbolRules,
  isNotionalValid,
  isQuantityValid,
  roundPriceToTick,
  roundQuantityToStep,
} from "../symbolRules";

test("createSymbolRules normalizes symbol and freezes rules", () => {
  const rules = createSymbolRules({
    symbol: " btcusdt ",
    priceTickSize: 0.01,
    quantityStepSize: 0.001,
    minQuantity: 0.001,
    maxQuantity: 10,
    minNotional: 5,
    maxNotional: 1000,
  });

  assert.equal(rules.symbol, "BTCUSDT");
  assert.equal(rules.priceTickSize, 0.01);
  assert.equal(Object.isFrozen(rules), true);
});

test("createSymbolRules rejects invalid numeric rules", () => {
  assert.throws(
    () =>
      createSymbolRules({
        symbol: "BTCUSDT",
        priceTickSize: 0,
        quantityStepSize: 0.001,
        minQuantity: 0.001,
        minNotional: 5,
      }),
    /Price tick size/,
  );

  assert.throws(
    () =>
      createSymbolRules({
        symbol: "BTCUSDT",
        priceTickSize: 0.01,
        quantityStepSize: 0.001,
        minQuantity: 0.001,
        maxQuantity: 0.0001,
        minNotional: 5,
      }),
    /Maximum quantity/,
  );

  assert.throws(
    () =>
      createSymbolRules({
        symbol: "BTCUSDT",
        priceTickSize: 0.01,
        quantityStepSize: 0.001,
        minQuantity: 0.001,
        minNotional: 5,
        maxNotional: 4,
      }),
    /Maximum notional/,
  );
});

test("createSymbolRules rejects empty symbol", () => {
  assert.throws(
    () =>
      createSymbolRules({
        symbol: "   ",
        priceTickSize: 0.01,
        quantityStepSize: 0.001,
        minQuantity: 0.001,
        minNotional: 5,
      }),
    /Symbol cannot be empty/,
  );
});

test("quantity and notional validation use symbol rules", () => {
  const rules = createSymbolRules({
    symbol: "BTCUSDT",
    priceTickSize: 0.01,
    quantityStepSize: 0.001,
    minQuantity: 0.01,
    maxQuantity: 1,
    minNotional: 10,
    maxNotional: 100,
  });

  assert.equal(isQuantityValid(0.01, rules), true);
  assert.equal(isQuantityValid(0.011, rules), true);
  assert.equal(isQuantityValid(0.0115, rules), false);
  assert.equal(isQuantityValid(1.001, rules), false);

  assert.equal(isNotionalValid(1000, 0.01, rules), true);
  assert.equal(isNotionalValid(500, 0.01, rules), false);
  assert.equal(isNotionalValid(1000, 0.101, rules), false);
  assert.equal(isNotionalValid(0, 1, rules), false);
});

test("rounding rejects invalid inputs", () => {
  assert.throws(() => roundPriceToTick(0, 0.01), /greater than zero/);
  assert.throws(() => roundPriceToTick(100, 0), /greater than zero/);
  assert.throws(() => roundQuantityToStep(0, 0.001), /greater than zero/);
  assert.throws(() => roundQuantityToStep(1, 0), /greater than zero/);
});

test("rounding uses downward exchange-compatible increments", () => {
  assert.equal(roundPriceToTick(100.129, 0.01), 100.12);
  assert.equal(roundQuantityToStep(1.239, 0.01), 1.23);
});
