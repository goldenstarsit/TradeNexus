import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeConfig,
  getDefaultExchangeConfig,
  hasExchangeCredentials,
} from "../index";

test("default exchange configuration is disabled and contains no credentials", () => {
  const config = getDefaultExchangeConfig("binance");
  assert.equal(config.id, "binance");
  assert.equal(config.name, "Binance");
  assert.equal(config.baseUrl, "https://api.binance.com");
  assert.deepEqual(config.marketTypes, ["spot", "futures"]);
  assert.equal(config.enabled, false);
  assert.equal("apiKey" in config, false);
  assert.equal("apiSecret" in config, false);
});

test("exchange configuration supports safe overrides", () => {
  const config = createExchangeConfig("mexc", {
    enabled: true,
    baseUrl: "https://custom.example.com",
    marketTypes: ["spot"],
  });
  assert.equal(config.id, "mexc");
  assert.equal(config.enabled, true);
  assert.equal(config.baseUrl, "https://custom.example.com");
  assert.deepEqual(config.marketTypes, ["spot"]);
});

test("credential validation requires both API key and API secret", () => {
  assert.equal(hasExchangeCredentials({ apiKey: "", apiSecret: "" }), false);
  assert.equal(hasExchangeCredentials({ apiKey: "key", apiSecret: "" }), false);
  assert.equal(hasExchangeCredentials({ apiKey: "", apiSecret: "secret" }), false);
  assert.equal(hasExchangeCredentials({ apiKey: "key", apiSecret: "secret" }), true);
});
