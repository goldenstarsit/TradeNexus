import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeMetadata,
  EXCHANGE_IDS,
  ExchangeError,
  isExchangeId,
  type TradingSymbol,
} from "../index";

test("exchange domain exposes supported exchange IDs", () => {
  assert.deepEqual(EXCHANGE_IDS, ["binance", "mexc", "htx"]);
  assert.equal(isExchangeId("binance"), true);
  assert.equal(isExchangeId("unknown"), false);
});

test("exchange metadata and symbol models are valid", () => {
  const metadata = createExchangeMetadata({
    id: "mexc",
    name: "MEXC",
    status: "enabled",
    baseUrl: "https://api.mexc.com",
    marketTypes: ["spot"],
  });
  const symbol: TradingSymbol = {
    exchangeSymbol: "BTCUSDT",
    baseAsset: { symbol: "BTC" },
    quoteAsset: { symbol: "USDT" },
    marketType: "spot",
  };
  assert.equal(metadata.id, "mexc");
  assert.equal(symbol.exchangeSymbol, "BTCUSDT");
});

test("exchange errors preserve exchange context", () => {
  const error = new ExchangeError("binance", "RATE_LIMIT", "Too many requests");
  assert.equal(error.name, "ExchangeError");
  assert.equal(error.exchange, "binance");
  assert.equal(error.code, "RATE_LIMIT");
});
