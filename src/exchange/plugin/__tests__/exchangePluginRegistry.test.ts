import assert from "node:assert/strict";
import { createExchangePluginRegistry } from "../exchangePluginRegistry";
import { BinancePlugin } from "../../plugins/binance/binancePlugin";
import { MexcPlugin } from "../../plugins/mexc/mexcPlugin";
import { createHtxPlugin } from "../../plugins/htx/htxPlugin";

async function run(): Promise<void> {
  const clients = {
    marketData: {
      async getTicker() { throw new Error("test market data client should not be called"); },
      async getOrderBook() { throw new Error("test market data client should not be called"); },
    },
    account: {
      async getBalances() { throw new Error("test account client should not be called"); },
    },
    order: {
      async getOpenOrders() { throw new Error("test order client should not be called"); },
      async getOrder() { throw new Error("test order client should not be called"); },
      async placeOrder() { throw new Error("test order client should not be called"); },
      async cancelOrder() { throw new Error("test order client should not be called"); },
      async cancelAllOrders() { throw new Error("test order client should not be called"); },
    },
  };

  const binance = new BinancePlugin(clients);
  const mexc = new MexcPlugin(clients);
  const htx = createHtxPlugin(clients);

  const registry = createExchangePluginRegistry([
    binance,
    mexc,
    htx,
  ]);

  assert.equal(registry.has("binance"), true);
  assert.equal(registry.has("mexc"), true);
  assert.equal(registry.has("htx"), true);

  assert.equal(registry.get("binance"), binance);
  assert.equal(registry.get("mexc"), mexc);
  assert.equal(registry.get("htx"), htx);

  assert.deepEqual(
    registry.getAll().map((plugin) => plugin.metadata.id),
    ["binance", "mexc", "htx"],
  );

  assert.throws(
    () => registry.get("kraken" as never),
    /Exchange plugin not registered: kraken/,
  );

  assert.throws(
    () => registry.register(new BinancePlugin(clients)),
    /Exchange plugin already registered: binance/,
  );

  assert.equal(registry.has("binance"), true);

  assert.throws(
    () =>
      registry.register({
        ...binance,
        metadata: {
          ...binance.metadata,
          id: "kraken" as never,
        },
      } as never),
    /Unsupported exchange plugin ID: kraken/,
  );

  assert.throws(
    () =>
      registry.register({
        ...binance,
        capabilities: {
          ...binance.capabilities,
          exchangeId: "mexc",
        },
      } as never),
    /Exchange plugin capability ID mismatch: binance/,
  );

  assert.throws(
    () => {
      const invalidPlugin = Object.create(binance);

      Object.defineProperty(invalidPlugin, "capabilities", {
        value: {
          exchangeId: "binance",
          supports(capability: string) {
            return capability === "futures" || capability === "spot";
          },
        },
        writable: true,
        configurable: true,
      });

      const capabilityMismatchRegistry = createExchangePluginRegistry();
      capabilityMismatchRegistry.register(invalidPlugin);
    },
    /Exchange plugin capability market type mismatch: binance:futures/,
  );

  assert.throws(
    () =>
      registry.register({
        ...binance,
        capabilities: {
          ...binance.capabilities,
          supports(capability: never) {
            return capability !== "spot";
          },
        },
      } as never),
    /Exchange plugin market type capability missing: binance:spot/,
  );

    assert.throws(
      () => {
        const invalidPlugin = Object.create(binance);
        invalidPlugin.getTicker = undefined;
        registry.register(invalidPlugin);
      },
      /Exchange plugin method is missing: getTicker/,
    );

  const empty = createExchangePluginRegistry();

  assert.equal(empty.getAll().length, 0);

  assert.throws(
    () => empty.get("mexc"),
    /Exchange plugin not registered: mexc/,
  );

  console.log("M57 Exchange Plugin Registry verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
