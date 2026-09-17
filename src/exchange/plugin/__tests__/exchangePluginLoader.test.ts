import assert from "node:assert/strict";
import {
  createExchangePluginLoader,
  getExchangePluginFactory,
} from "../exchangePluginLoader";

async function run(): Promise<void> {
  const loader = createExchangePluginLoader();

  const registry = loader.load(["binance", "mexc", "htx"]);

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

  assert.equal(binanceFactory().metadata.id, "binance");
  assert.equal(mexcFactory().metadata.id, "mexc");
  assert.equal(htxFactory().metadata.id, "htx");

  const selected = loader.load(["mexc"]);

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
