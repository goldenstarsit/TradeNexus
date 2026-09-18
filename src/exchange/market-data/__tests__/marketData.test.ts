import assert from "node:assert/strict";
import test from "node:test";

import {
  createMarketTicker,
  createMarketTrade,
  createOrderBook,
  createOrderBookLevel,
  isMarketTradeSide,
} from "../marketData";

test("creates normalized immutable ticker", () => {
  const ticker = createMarketTicker({
    symbol: " btcusdt ",
    lastPrice: 100000,
    bidPrice: 99999,
    askPrice: 100001,
    bidQuantity: 0.5,
    askQuantity: 0.4,
    volume: 1234,
    quoteVolume: 123400000,
    timestamp: 1000,
  });

  assert.equal(ticker.symbol, "BTCUSDT");
  assert.equal(ticker.lastPrice, 100000);
  assert.ok(Object.isFrozen(ticker));

  assert.throws(
    () => ((ticker as { lastPrice: number }).lastPrice = 1),
    TypeError,
  );
});

test("validates ticker prices and optional quantities", () => {
  assert.throws(
    () =>
      createMarketTicker({
        symbol: "BTCUSDT",
        lastPrice: 0,
        timestamp: 1,
      }),
    /Last price/,
  );

  assert.throws(
    () =>
      createMarketTicker({
        symbol: "BTCUSDT",
        lastPrice: 100,
        bidPrice: 101,
        askPrice: 100,
        timestamp: 1,
      }),
    /Bid price cannot exceed ask price/,
  );

  assert.throws(
    () =>
      createMarketTicker({
        symbol: "BTCUSDT",
        lastPrice: 100,
        volume: -1,
        timestamp: 1,
      }),
    /Volume/,
  );
});

test("creates immutable order book levels", () => {
  const level = createOrderBookLevel({
    price: 99999,
    quantity: 0.5,
  });

  assert.deepEqual(level, {
    price: 99999,
    quantity: 0.5,
  });
  assert.ok(Object.isFrozen(level));
});

test("creates sorted immutable order book", () => {
  const orderBook = createOrderBook({
    symbol: "btcusdt",
    bids: [
      { price: 99999, quantity: 0.5 },
      { price: 99998, quantity: 1 },
    ],
    asks: [
      { price: 100001, quantity: 0.4 },
      { price: 100002, quantity: 1 },
    ],
    timestamp: 1000,
  });

  assert.equal(orderBook.symbol, "BTCUSDT");
  assert.deepEqual(
    orderBook.bids.map((level) => level.price),
    [99999, 99998],
  );
  assert.deepEqual(
    orderBook.asks.map((level) => level.price),
    [100001, 100002],
  );
  assert.ok(Object.isFrozen(orderBook));
  assert.ok(Object.isFrozen(orderBook.bids));
  assert.ok(Object.isFrozen(orderBook.asks));
  assert.ok(Object.isFrozen(orderBook.bids[0]));
});

test("rejects invalid order book ordering and crossed spread", () => {
  assert.throws(
    () =>
      createOrderBook({
        symbol: "BTCUSDT",
        bids: [
          { price: 99998, quantity: 1 },
          { price: 99999, quantity: 1 },
        ],
        asks: [{ price: 100001, quantity: 1 }],
        timestamp: 1,
      }),
    /Bids must be sorted/,
  );

  assert.throws(
    () =>
      createOrderBook({
        symbol: "BTCUSDT",
        bids: [{ price: 100001, quantity: 1 }],
        asks: [
          { price: 100000, quantity: 1 },
          { price: 100002, quantity: 1 },
        ],
        timestamp: 1,
      }),
    /Order book bid must be below ask/,
  );
});

test("creates and validates market trades", () => {
  const trade = createMarketTrade({
    symbol: "ethusdt",
    price: 4000,
    quantity: 0.25,
    timestamp: 1000,
    side: "buy",
  });

  assert.equal(trade.symbol, "ETHUSDT");
  assert.equal(trade.side, "buy");
  assert.ok(Object.isFrozen(trade));

  assert.equal(isMarketTradeSide("buy"), true);
  assert.equal(isMarketTradeSide("sell"), true);
  assert.equal(isMarketTradeSide("invalid"), false);

  assert.throws(
    () =>
      createMarketTrade({
        symbol: "ETHUSDT",
        price: 0,
        quantity: 1,
        timestamp: 1,
      }),
    /Trade price/,
  );

  assert.throws(
    () =>
      createMarketTrade({
        symbol: "ETHUSDT",
        price: 4000,
        quantity: -1,
        timestamp: 1,
      }),
    /Trade quantity/,
  );
});

console.log("M29 market data contract verification: OK");
