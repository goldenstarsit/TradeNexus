import assert from "node:assert/strict";
import { createHtxPlugin, HTX_CAPABILITIES } from "../htxPlugin";

async function run() {
  const plugin = createHtxPlugin();

  assert.equal(plugin.metadata.id, "htx");
  assert.equal(plugin.metadata.name, "HTX");
  assert.equal(plugin.metadata.baseUrl, "https://api.huobi.pro");
  assert.deepEqual(plugin.metadata.marketTypes, ["spot", "futures"]);
  assert.equal(plugin.metadata.status, "disabled");
  assert.deepEqual(await plugin.getSymbols(), []);
  assert.equal(await plugin.getSymbol("BTCUSDT"), undefined);
  assert.equal(HTX_CAPABILITIES.exchangeId, "htx");
  for (const capability of ["spot", "futures", "marketOrders", "limitOrders", "makerOnlyOrders", "orderBook", "websocketMarketData", "websocketUserData", "balances", "orderHistory", "tradeHistory", "rateLimits"] as const) {
    assert.equal(HTX_CAPABILITIES.supports(capability), true, capability);
  }

  await assert.rejects(() => plugin.getTicker("BTCUSDT"), /HTX getTicker is not implemented yet/);
  await assert.rejects(() => plugin.getOrderBook("BTCUSDT"), /HTX getOrderBook is not implemented yet/);
  await assert.rejects(() => plugin.getBalance("USDT"), /HTX getBalance is not implemented yet/);
  await assert.rejects(() => plugin.getOpenOrders("BTCUSDT"), /HTX getOpenOrders is not implemented yet/);
  await assert.rejects(() => plugin.getOrder("1", "BTCUSDT"), /HTX getOrder is not implemented yet/);
  await assert.rejects(() => plugin.placeOrder({}), /HTX placeOrder is not implemented yet/);
  await assert.rejects(() => plugin.cancelOrder("1", "BTCUSDT"), /HTX cancelOrder is not implemented yet/);
  await assert.rejects(() => plugin.cancelAllOrders("BTCUSDT"), /HTX cancelAllOrders is not implemented yet/);

  console.log("M50 HTX plugin foundation verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
