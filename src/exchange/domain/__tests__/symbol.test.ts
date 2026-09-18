import test from "node:test";
import assert from "node:assert/strict";
import {
  createAsset,
  createTradingSymbol,
  type TradingSymbol,
} from "../symbol";

test("asset and trading symbol factories normalize and freeze values", () => {
  const asset = createAsset(" btc ");

  assert.equal(asset.symbol, "BTC");
  assert.equal(Object.isFrozen(asset), true);

  const symbol = createTradingSymbol({
    exchangeSymbol: " btcusdt ",
    baseAsset: " btc ",
    quoteAsset: " usdt ",
    marketType: "spot",
  });

  assert.equal(symbol.exchangeSymbol, "BTCUSDT");
  assert.equal(symbol.baseAsset.symbol, "BTC");
  assert.equal(symbol.quoteAsset.symbol, "USDT");
  assert.equal(symbol.marketType, "spot");
  assert.equal(Object.isFrozen(symbol), true);
  assert.equal(Object.isFrozen(symbol.baseAsset), true);
  assert.equal(Object.isFrozen(symbol.quoteAsset), true);

  const typed: TradingSymbol = symbol;
  assert.equal(typed.exchangeSymbol, "BTCUSDT");
});

test("trading symbol factory rejects invalid symbols", () => {
  assert.throws(
    () =>
      createTradingSymbol({
        exchangeSymbol: "   ",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        marketType: "spot",
      }),
    /Exchange symbol cannot be empty/,
  );

  assert.throws(
    () =>
      createTradingSymbol({
        exchangeSymbol: "BTCUSDT",
        baseAsset: "   ",
        quoteAsset: "USDT",
        marketType: "spot",
      }),
    /Base asset cannot be empty/,
  );

  assert.throws(
    () =>
      createTradingSymbol({
        exchangeSymbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "   ",
        marketType: "spot",
      }),
    /Quote asset cannot be empty/,
  );
});
