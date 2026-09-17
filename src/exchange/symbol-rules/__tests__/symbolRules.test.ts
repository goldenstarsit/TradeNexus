import assert from "node:assert/strict";
import {
  isNotionalValid,
  isQuantityValid,
  roundPriceToTick,
  roundQuantityToStep,
  type SymbolRules,
 } from "../index";

const rules: SymbolRules = {
  symbol: "BTCUSDT",
  priceTickSize: 0.01,
  quantityStepSize: 0.00001,
  minQuantity: 0.00001,
  maxQuantity: 10,
  minNotional: 1,
  maxNotional: 1000000,
};

assert.equal(roundPriceToTick(100.019, rules.priceTickSize), 100.01);
assert.equal(roundQuantityToStep(0.123456, rules.quantityStepSize), 0.12345);
assert.equal(isQuantityValid(0.12345, rules), true);
assert.equal(isQuantityValid(0.123456, rules), false);
assert.equal(isQuantityValid(0.000001, rules), false);
assert.equal(isNotionalValid(100, 0.01, rules), true);
assert.equal(isNotionalValid(50, 0.01, rules), false);
console.log("M30 symbol rules verification: OK");
