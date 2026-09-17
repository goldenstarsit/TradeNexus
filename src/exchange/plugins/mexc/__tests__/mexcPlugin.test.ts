import assert from "node:assert/strict";
import { MexcPlugin, MEXC_CAPABILITIES, MEXC_METADATA } from "../index";

async function run() {
const plugin = new MexcPlugin();
assert.equal(plugin.metadata.id, "mexc");
assert.equal(plugin.metadata.name, "MEXC");
assert.equal(plugin.metadata.baseUrl, "https://api.mexc.com");
assert.deepEqual(plugin.metadata.marketTypes, ["spot", "futures"]);
assert.equal(plugin.metadata.status, "disabled");
assert.equal(plugin.capabilities.exchangeId, "mexc");
for (const capability of [
  "spot", "futures", "marketOrders", "limitOrders", "makerOnlyOrders",
  "orderBook", "websocketMarketData", "websocketUserData", "balances",
  "orderHistory", "tradeHistory", "rateLimits",
]) assert.equal(plugin.capabilities.supports(capability as never), true);
assert.strictEqual(plugin.capabilities, MEXC_CAPABILITIES);
assert.strictEqual(plugin.metadata, MEXC_METADATA);
assert.deepEqual(await plugin.getSymbols(), []);
assert.equal(await plugin.getSymbol("BTCUSDT"), undefined);
await assert.rejects(() => plugin.getTicker("BTCUSDT"), /MEXC market data is not implemented yet/);
await assert.rejects(() => plugin.getBalance("USDT"), /MEXC account access is not implemented yet/);
await assert.rejects(() => plugin.getOpenOrders("BTCUSDT"), /MEXC order management is not implemented yet/);
console.log("M43 MEXC plugin foundation verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
