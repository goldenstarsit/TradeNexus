import assert from "node:assert/strict";
import {
  calculateAverageFillPrice,
  calculateQuoteQuantity,
  type Fill,
 } from "../index";

const fills: Fill[] = [
  {
    id: "fill-1",
    orderId: "order-1",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    price: 100000,
    quantity: 0.01,
    quoteQuantity: 1000,
    fee: 0.001,
    feeAsset: "BTC",
    timestamp: Date.now(),
  },
  {
    id: "fill-2",
    orderId: "order-1",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    price: 101000,
    quantity: 0.02,
    quoteQuantity: 2020,
    fee: 0.002,
    feeAsset: "BTC",
    timestamp: Date.now(),
  },
];

assert.equal(calculateQuoteQuantity(100000, 0.01), 1000);
assert.ok(Math.abs(calculateAverageFillPrice(fills) - 100666.66666666667) < 1e-10);
assert.equal(calculateAverageFillPrice([]), 0);
assert.equal(calculateQuoteQuantity(0, 2), 0);

console.log("M33 fill/trade model verification: OK");
