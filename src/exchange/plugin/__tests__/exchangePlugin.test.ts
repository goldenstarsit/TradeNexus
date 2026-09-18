import test from "node:test";
import assert from "node:assert/strict";
import type { ExchangePlugin, ExchangeOrderRequest } from "../exchangePlugin";
import type { ExchangeMetadata } from "../../domain/exchangeMetadata";
import type { ExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import type { BalanceSnapshot } from "../../balance/balance";
import type { MarketTicker, OrderBook } from "../../market-data/marketData";
import type { Order } from "../../order/order";

test("exchange plugin contract exposes required metadata, capabilities and trading operations", async () => {
  const methods: readonly (keyof ExchangePlugin)[] = [
    "metadata",
    "capabilities",
    "getSymbols",
    "getSymbol",
    "getTicker",
    "getOrderBook",
    "getBalance",
    "getOpenOrders",
    "getOrder",
    "placeOrder",
    "cancelOrder",
    "cancelAllOrders",
  ];

  const metadata: ExchangeMetadata = {
    id: "binance",
    name: "Binance",
    status: "enabled",
    baseUrl: "https://api.binance.com",
    marketTypes: ["spot"],
  };

  const capabilities = {
    exchangeId: "binance",
    supports: () => true,
  } as unknown as ExchangeCapabilities;

  const ticker: MarketTicker = {
    symbol: "BTCUSDT",
    lastPrice: 100000,
    timestamp: Date.now(),
  };

  const orderBook: OrderBook = {
    symbol: "BTCUSDT",
    bids: [],
    asks: [],
    timestamp: Date.now(),
  };

  const balance: BalanceSnapshot = {
    exchange: "binance",
    balances: [],
    timestamp: Date.now(),
  };

  const order: Order = {
    id: "test-order",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    type: "limit",
    status: "new",
    quantity: 0.001,
    executedQuantity: 0,
    remainingQuantity: 0.001,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const request: ExchangeOrderRequest = {
    symbol: "BTCUSDT",
    side: "buy",
    type: "limit",
    quantity: 0.001,
    price: 100000,
  };

  const plugin: ExchangePlugin = {
    metadata,
    capabilities,
    getSymbols: async () => [],
    getSymbol: async () => undefined,
    getTicker: async () => ticker,
    getOrderBook: async () => orderBook,
    getBalance: async () => balance,
    getOpenOrders: async () => [],
    getOrder: async () => order,
    placeOrder: async (_request: ExchangeOrderRequest) => order,
    cancelOrder: async () => order,
    cancelAllOrders: async () => [],
  };

  for (const method of methods) {
    assert.equal(method in plugin, true, `${String(method)} is missing`);
  }

  assert.equal(plugin.metadata.id, "binance");
  assert.equal(plugin.capabilities.exchangeId, "binance");
  assert.equal(plugin.capabilities.supports("spot"), true);
  assert.deepEqual(await plugin.getTicker("BTCUSDT"), ticker);
  assert.deepEqual(await plugin.getOrderBook("BTCUSDT"), orderBook);
  assert.deepEqual(await plugin.getBalance("USDT"), balance);
  assert.deepEqual(await plugin.placeOrder(request), order);
});
