import assert from "node:assert/strict";
import { BinancePlugin, BINANCE_CAPABILITIES, BINANCE_METADATA } from "../index";

const plugin = new BinancePlugin();

assert.equal(plugin.metadata.id, "binance");
assert.equal(plugin.metadata.name, "Binance");
assert.equal(plugin.metadata.baseUrl, "https://api.binance.com");
assert.deepEqual(plugin.metadata.marketTypes, ["spot", "futures"]);
assert.equal(plugin.metadata.status, "disabled");
assert.equal(plugin.capabilities, BINANCE_CAPABILITIES);
assert.equal(plugin.capabilities.supports("spot"), true);
assert.equal(plugin.capabilities.supports("limitOrders"), true);
assert.equal(plugin.capabilities.supports("makerOnlyOrders"), true);
assert.equal(plugin.capabilities.supports("balances"), true);
assert.equal(plugin.capabilities.supports("cancelReplace"), false);
assert.equal(BINANCE_METADATA, plugin.metadata);

console.log("M36 Binance plugin foundation verification: OK");
