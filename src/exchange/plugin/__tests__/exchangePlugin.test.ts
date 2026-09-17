import test from "node:test";
import assert from "node:assert/strict";
import type { ExchangePlugin } from "../exchangePlugin";
import type { ExchangeMetadata } from "../../domain/exchangeMetadata";

test("exchange plugin contract exposes required metadata and trading operations", () => {
  const methods: readonly (keyof ExchangePlugin)[] = [
    "metadata",
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

  const plugin: ExchangePlugin = {
    metadata,
    getSymbols: async () => [],
    getSymbol: async () => undefined,
    getTicker: async () => ({}),
    getOrderBook: async () => ({}),
    getBalance: async () => ({}),
    getOpenOrders: async () => [],
    getOrder: async () => ({}),
    placeOrder: async () => ({}),
    cancelOrder: async () => ({}),
    cancelAllOrders: async () => [],
  };

  for (const method of methods) {
    assert.equal(method in plugin, true, `${String(method)} is missing`);
  }

  assert.equal(plugin.metadata.id, "binance");
});
