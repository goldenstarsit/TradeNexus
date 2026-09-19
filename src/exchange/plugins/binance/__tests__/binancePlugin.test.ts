import assert from "node:assert/strict";
import { BinancePlugin, BINANCE_CAPABILITIES, BINANCE_METADATA } from "../index";

const httpClient = {
  async request<T>() {
    throw new Error("test HTTP client should not be called");
  },
};

const clients = {
  marketData: {
    async getTicker() {
      throw new Error("test market data client should not be called");
    },
    async getOrderBook() {
      throw new Error("test market data client should not be called");
    },
  },
  account: {
    async getBalances() {
      throw new Error("test account client should not be called");
    },
  },
  order: {
    async getOpenOrders() {
      throw new Error("test order client should not be called");
    },
    async getOrder() {
      throw new Error("test order client should not be called");
    },
    async placeOrder() {
      throw new Error("test order client should not be called");
    },
    async cancelOrder() {
      throw new Error("test order client should not be called");
    },
    async cancelAllOrders() {
      throw new Error("test order client should not be called");
    },
  },
};

const plugin = new BinancePlugin(clients);

assert.equal(plugin.metadata.id, "binance");
assert.equal(plugin.metadata.name, "Binance");
assert.equal(plugin.metadata.baseUrl, "https://api.binance.com");
assert.deepEqual(plugin.metadata.marketTypes, ["spot"]);
assert.equal(plugin.metadata.status, "disabled");
assert.equal(plugin.capabilities, BINANCE_CAPABILITIES);
assert.equal(plugin.capabilities.supports("spot"), true);
assert.equal(plugin.capabilities.supports("limitOrders"), true);
assert.equal(plugin.capabilities.supports("makerOnlyOrders"), true);
assert.equal(plugin.capabilities.supports("balances"), true);
assert.equal(plugin.capabilities.supports("cancelReplace"), false);
assert.equal(BINANCE_METADATA, plugin.metadata);

console.log("M36 Binance plugin foundation verification: OK");
