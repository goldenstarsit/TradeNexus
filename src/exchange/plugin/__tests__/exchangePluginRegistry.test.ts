import assert from "node:assert/strict";
import { createExchangePluginRegistry } from "../exchangePluginRegistry";
import { BinancePlugin } from "../../plugins/binance/binancePlugin";
import { MexcPlugin } from "../../plugins/mexc/mexcPlugin";
import { createHtxPlugin } from "../../plugins/htx/htxPlugin";

async function run(): Promise<void> {
  const binance = new BinancePlugin();
  const mexc = new MexcPlugin();
  const htx = createHtxPlugin();

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
    () => registry.register(new BinancePlugin()),
    /Exchange plugin already registered: binance/,
  );

  assert.equal(registry.has("binance"), true);

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
