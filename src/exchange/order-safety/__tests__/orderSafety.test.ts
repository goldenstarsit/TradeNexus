import assert from "node:assert/strict";
import { validateOrderRequest } from "../index";
import type { SymbolRules } from "../../symbol-rules/symbolRules";

const rules: SymbolRules = {
  symbol: "BTCUSDT",
  priceTickSize: 0.01,
  quantityStepSize: 0.001,
  minQuantity: 0.001,
  maxQuantity: 10,
  minNotional: 10,
};

const valid = validateOrderRequest({
  symbol: "BTCUSDT",
  side: "buy",
  type: "limit",
  quantity: 0.01,
  price: 100000,
}, rules);
assert.equal(valid.valid, true);
assert.deepEqual(valid.errors, []);

const missingPrice = validateOrderRequest({
  symbol: "BTCUSDT",
  side: "buy",
  type: "limit",
  quantity: 0.01,
}, rules);
assert.equal(missingPrice.valid, false);

const invalidQuantity = validateOrderRequest({
  symbol: "BTCUSDT",
  side: "buy",
  type: "market",
  quantity: 0.0005,
}, rules);
assert.equal(invalidQuantity.valid, false);

const invalidStop = validateOrderRequest({
  symbol: "BTCUSDT",
  side: "sell",
  type: "stopMarket",
  quantity: 0.01,
}, rules);
assert.equal(invalidStop.valid, false);

const invalidNotional = validateOrderRequest({
  symbol: "BTCUSDT",
  side: "buy",
  type: "limit",
  quantity: 0.001,
  price: 100,
}, rules);
assert.equal(invalidNotional.valid, false);

console.log("M35 order safety validation verification: OK");
