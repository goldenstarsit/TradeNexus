import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeCapabilities,
  type ExchangeCapability,
 } from "../index";

test("exchange capabilities report supported operations", () => {
  const capabilities: readonly ExchangeCapability[] = [
    "spot",
    "limitOrders",
    "makerOnlyOrders",
    "orderBook",
    "balances",
    "rateLimits",
  ];

  const result = createExchangeCapabilities("mexc", capabilities);

  assert.equal(result.exchangeId, "mexc");
  assert.equal(result.supports("spot"), true);
  assert.equal(result.supports("makerOnlyOrders"), true);
  assert.equal(result.supports("balances"), true);
  assert.equal(result.supports("futures"), false);
  assert.equal(result.supports("marketOrders"), false);
});

test("exchange capabilities preserve an immutable capability view", () => {
  const result = createExchangeCapabilities("binance", ["spot", "orderBook"]);

  assert.equal(result.supported.has("spot"), true);
  assert.equal(result.supported.has("orderBook"), true);
  assert.equal(result.supported.has("websocketUserData"), false);
});
