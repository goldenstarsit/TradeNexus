import assert from "node:assert/strict";
import { createHtxPlugin, HTX_CAPABILITIES, HTX_METADATA } from "../index";

const ticker = {
  symbol: "BTCUSDT",
  lastPrice: 100,
  bidPrice: 99,
  askPrice: 101,
  bidQuantity: 1,
  askQuantity: 1,
  volume: 10,
  timestamp: 1000,
};

const orderBook = {
  symbol: "BTCUSDT",
  bids: [{ price: 99, quantity: 1 }],
  asks: [{ price: 101, quantity: 1 }],
  timestamp: 1000,
};

const balance = {
  exchange: "htx",
  balances: [{ asset: "USDT", free: 1000, locked: 0 }],
  timestamp: 1000,
};

const order = {
  id: "1",
  exchange: "htx",
  symbol: "BTCUSDT",
  side: "buy" as const,
  type: "limit" as const,
  status: "new" as const,
  price: 100,
  quantity: 1,
  executedQuantity: 0,
  remainingQuantity: 1,
  createdAt: 1000,
  updatedAt: 1000,
};

async function run() {
  const calls: string[] = [];

  const plugin = createHtxPlugin({
    marketData: {
      async getTicker(symbol) {
        calls.push(`ticker:${symbol}`);
        return ticker;
      },
      async getOrderBook(symbol, limit) {
        calls.push(`book:${symbol}:${limit ?? "default"}`);
        return orderBook;
      },
    },
    account: {
      async getBalances(asset) {
        calls.push(`balance:${asset ?? "all"}`);
        return balance;
      },
    },
    order: {
      async getOpenOrders(symbol) {
        calls.push(`open:${symbol ?? "all"}`);
        return [order];
      },
      async getOrder(orderId, symbol) {
        calls.push(`get:${orderId}:${symbol}`);
        return order;
      },
      async placeOrder(request) {
        calls.push(`place:${request.symbol}`);
        return order;
      },
      async cancelOrder(orderId, symbol) {
        calls.push(`cancel:${orderId}:${symbol}`);
        return order;
      },
      async cancelAllOrders(symbol) {
        calls.push(`cancelAll:${symbol ?? "all"}`);
        return [order];
      },
    },
  });

  assert.equal(plugin.metadata.id, "htx");
  assert.equal(plugin.metadata.name, "HTX");
  assert.equal(plugin.metadata.baseUrl, "https://api.huobi.pro");
  assert.deepEqual(plugin.metadata.marketTypes, ["spot"]);
  assert.equal(plugin.metadata.status, "disabled");
  assert.strictEqual(plugin.capabilities, HTX_CAPABILITIES);
  assert.strictEqual(plugin.metadata, HTX_METADATA);

  assert.deepEqual(await plugin.getSymbols(), []);
  assert.equal(await plugin.getSymbol("BTCUSDT"), undefined);
  assert.deepEqual(await plugin.getTicker("BTCUSDT"), ticker);
  assert.deepEqual(await plugin.getOrderBook("BTCUSDT", 20), orderBook);
  assert.deepEqual(await plugin.getBalance("USDT"), balance);
  assert.deepEqual(await plugin.getOpenOrders("BTCUSDT"), [order]);
  assert.deepEqual(await plugin.getOrder("1", "BTCUSDT"), order);
  assert.deepEqual(
    await plugin.placeOrder({
      symbol: "BTCUSDT",
      side: "buy",
      type: "limit",
      quantity: 1,
      price: 100,
    }),
    order,
  );
  assert.deepEqual(await plugin.cancelOrder("1", "BTCUSDT"), order);
  assert.deepEqual(await plugin.cancelAllOrders(), [order]);

  assert.deepEqual(calls, [
    "ticker:BTCUSDT",
    "book:BTCUSDT:20",
    "balance:USDT",
    "open:BTCUSDT",
    "get:1:BTCUSDT",
    "place:BTCUSDT",
    "cancel:1:BTCUSDT",
    "cancelAll:all",
  ]);

  console.log("HTX plugin abstraction delegation verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
