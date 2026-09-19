import assert from "node:assert/strict";
import type { ExchangePlugin } from "../../exchange/plugin/exchangePlugin";
import type { Fill } from "../../exchange/fill/fill";
import type { Order } from "../../exchange/order/order";
import { createExchangePluginRegistry } from "../../exchange/plugin/exchangePluginRegistry";
import { createExchangeFailoverManager } from "../../exchange/failover/exchangeFailoverManager";
import { createSymbolMappingManager } from "../../exchange/symbol-mapping/symbolMapping";
import {
  createExchangeAgnosticTradingService,
} from "../exchangeAgnosticTradingService";

function createPlugin(
  exchangeId: "binance" | "mexc",
  calls: string[],
): ExchangePlugin {
  return {
    metadata: {
      id: exchangeId,
      name: exchangeId,
      status: "enabled",
      baseUrl: `https://${exchangeId}.test`,
      marketTypes: ["spot"],
    },
    capabilities: {
      exchangeId,
      supported: new Set(["spot"]),
      supports(capability: string) {
        return capability === "spot";
      },
    },

    async getSymbols() {
      return [];
    },

    async getSymbol() {
      return undefined;
    },

    async getTicker() {
      return {} as never;
    },

    async getOrderBook() {
      return {} as never;
    },

    async getBalance() {
      return {} as never;
    },

    async getOpenOrders(symbol) {
      calls.push(`${exchangeId}:open:${symbol ?? "all"}`);
      return [`${exchangeId}-open`] as unknown as readonly Order[];
    },

    async getOrderFills() {
      return [] as readonly Fill[];
    },

    async getOrder(orderId, symbol) {
      calls.push(`${exchangeId}:get:${orderId}:${symbol}`);
      return { exchangeId, orderId, symbol } as unknown as Order;
    },

    async placeOrder(request) {
      calls.push(`${exchangeId}:place:${String((request as { symbol?: unknown }).symbol)}`);
      return request as unknown as Order;
    },

    async cancelOrder(orderId, symbol) {
      calls.push(`${exchangeId}:cancel:${orderId}:${symbol}`);
      return { exchangeId, orderId, symbol } as unknown as Order;
    },

    async cancelAllOrders(symbol) {
      calls.push(`${exchangeId}:cancel-all:${symbol ?? "all"}`);
      return [`${exchangeId}-canceled`] as unknown as readonly Order[];
    },
  };
}

async function run(): Promise<void> {
  const calls: string[] = [];

  const registry = createExchangePluginRegistry([
    createPlugin("binance", calls),
    createPlugin("mexc", calls),
  ]);

  const failover = createExchangeFailoverManager({
    exchanges: ["binance", "mexc"],
  });

  const symbolMapping = createSymbolMappingManager([
    {
      canonicalSymbol: "BTC/USDT",
      exchangeId: "binance",
      exchangeSymbol: "BTCUSDT",
      marketType: "spot",
    },
    {
      canonicalSymbol: "BTC/USDT",
      exchangeId: "mexc",
      exchangeSymbol: "BTCUSDT",
      marketType: "spot",
    },
  ]);

  const service = createExchangeAgnosticTradingService({
    registry,
    failover,
    symbolMapping,
  });

  assert.equal(service.getActiveExchange(), "binance");

  const placed = await service.placeOrder({
    symbol: "btc/usdt",
    marketType: "spot",
    side: "buy",
    type: "limit",
    quantity: 0.01,
    price: 100000,
  });

  assert.equal((placed as Record<string, unknown>).symbol, "BTCUSDT");
  assert.deepEqual(calls, ["binance:place:BTCUSDT"]);

  const order = await service.getOrder("123", "BTC/USDT", "spot");
  assert.deepEqual(order, {
    exchangeId: "binance",
    orderId: "123",
    symbol: "BTCUSDT",
  });

  const openOrders = await service.getOpenOrders("BTC/USDT", "spot");
  assert.deepEqual(openOrders, ["binance-open"]);

  const canceled = await service.cancelOrder("123", "BTC/USDT", "spot");
  assert.deepEqual(canceled, {
    exchangeId: "binance",
    orderId: "123",
    symbol: "BTCUSDT",
  });

  const allCanceled = await service.cancelAllOrders();
  assert.deepEqual(allCanceled, ["binance-canceled"]);

  await assert.rejects(
    () => service.getOpenOrders("BTC/USDT"),
    /marketType is required when symbol is provided/,
  );

  failover.updateHealth({
    exchangeId: "binance",
    status: "unavailable",
    healthy: false,
    consecutiveFailures: 3,
  });

  assert.equal(service.getActiveExchange(), "mexc");

  const failoverOrder = await service.placeOrder({
    symbol: "BTC/USDT",
    marketType: "spot",
    side: "sell",
    type: "limit",
    quantity: 0.01,
    price: 101000,
  });

  assert.equal(
    (failoverOrder as Record<string, unknown>).symbol,
    "BTCUSDT",
  );
  assert.equal(calls.at(-1), "mexc:place:BTCUSDT");

  const missingMappingService = createExchangeAgnosticTradingService({
    registry,
    failover,
    symbolMapping: createSymbolMappingManager(),
  });

  await assert.rejects(
    () =>
      missingMappingService.placeOrder({
        symbol: "ETH/USDT",
        marketType: "spot",
        side: "buy",
        type: "limit",
        quantity: 0.01,
      }),
    /Symbol mapping not registered/,
  );

  console.log("M63 Exchange-Agnostic Trading Service verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
