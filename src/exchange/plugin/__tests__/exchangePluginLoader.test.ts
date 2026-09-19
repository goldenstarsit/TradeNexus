import assert from "node:assert/strict";
import {
  createExchangePluginLoader,
  getExchangePluginFactory,
} from "../exchangePluginLoader";

async function run(): Promise<void> {
  const clients = {
    marketData: {
      async getTicker() { throw new Error("test market data client should not be called"); },
      async getOrderBook() { throw new Error("test market data client should not be called"); },
      async getSymbols() { throw new Error("test market data client should not be called"); },
      async getSymbol() { throw new Error("test market data client should not be called"); },
    },
    account: {
      async getBalances() { throw new Error("test account client should not be called"); },
    },
    fill: {
      async getOrderFills() { throw new Error("test fill client should not be called"); },
    },
    order: {
      async getOpenOrders() { throw new Error("test order client should not be called"); },
      async getOrder() { throw new Error("test order client should not be called"); },
      async placeOrder() { throw new Error("test order client should not be called"); },
      async cancelOrder() { throw new Error("test order client should not be called"); },
      async cancelAllOrders() { throw new Error("test order client should not be called"); },
    },
  };

  const loader = createExchangePluginLoader();

  const registry = loader.load(
    ["binance", "mexc", "htx"],
    {
      binance: clients,
      mexc: clients,
      htx: clients,
    },
  );

  assert.deepEqual(
    registry.getAll().map((plugin) => plugin.metadata.id),
    ["binance", "mexc", "htx"],
  );

  assert.equal(registry.get("binance").metadata.name, "Binance");
  assert.equal(registry.get("mexc").metadata.name, "MEXC");
  assert.equal(registry.get("htx").metadata.name, "HTX");

  const binanceFactory = getExchangePluginFactory("binance");
  const mexcFactory = getExchangePluginFactory("mexc");
  const htxFactory = getExchangePluginFactory("htx");

  assert.equal(
    binanceFactory({ binance: clients }).metadata.id,
    "binance",
  );
  assert.equal(
    mexcFactory({ mexc: clients }).metadata.id,
    "mexc",
  );
  assert.equal(
    htxFactory({ htx: clients }).metadata.id,
    "htx",
  );

  assert.throws(
    () => mexcFactory(),
    /MEXC plugin dependencies are required/,
  );

  assert.throws(
    () => htxFactory(),
    /HTX plugin dependencies are required/,
  );

  assert.throws(
    () => loader.load(["mexc"]),
    /MEXC plugin dependencies are required/,
  );

  assert.throws(
    () => loader.load(["htx"]),
    /HTX plugin dependencies are required/,
  );

  const selected = loader.load(["mexc"], { mexc: clients });

  assert.equal(selected.getAll().length, 1);
  assert.equal(selected.get("mexc").metadata.id, "mexc");
  assert.equal(selected.has("binance"), false);
  assert.equal(selected.has("htx"), false);

  const empty = loader.load([]);

  assert.equal(empty.getAll().length, 0);

  console.log("M58 Dynamic Exchange Loading verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
