import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeConfig,
  createExchangeSecrets,
  getDefaultExchangeConfig,
  hasExchangeCredentials,
} from "../index";

test("default exchange configuration is disabled and immutable", () => {
  const config = getDefaultExchangeConfig("binance");

  assert.equal(config.id, "binance");
  assert.equal(config.name, "Binance");
  assert.equal(config.baseUrl, "https://api.binance.com");
  assert.deepEqual(config.marketTypes, ["spot", "futures"]);
  assert.equal(config.enabled, false);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.marketTypes), true);
});

test("exchange configuration supports safe validated overrides", () => {
  const config = createExchangeConfig("mexc", {
    enabled: true,
    baseUrl: "https://custom.example.com/",
    marketTypes: ["spot", "spot"],
  });

  assert.equal(config.id, "mexc");
  assert.equal(config.enabled, true);
  assert.equal(config.baseUrl, "https://custom.example.com");
  assert.deepEqual(config.marketTypes, ["spot"]);
});

test("exchange configuration rejects invalid runtime values", () => {
  assert.throws(
    () => createExchangeConfig("kraken" as never),
    /Unsupported exchange ID: kraken/,
  );

  assert.throws(
    () => createExchangeConfig("binance", { name: "   " }),
    /Exchange name cannot be empty/,
  );

  assert.throws(
    () => createExchangeConfig("binance", { baseUrl: "not-a-url" }),
    /Invalid base URL/,
  );

  assert.throws(
    () =>
      createExchangeConfig("binance", {
        baseUrl: "ftp://example.com",
      }),
    /Unsupported base URL protocol/,
  );

  assert.throws(
    () =>
      createExchangeConfig("binance", {
        marketTypes: ["invalid" as never],
      }),
    /Unsupported market type: invalid/,
  );

  assert.throws(
    () =>
      createExchangeConfig("binance", {
        marketTypes: [] as never,
      }),
    /Market types cannot be empty/,
  );

  assert.throws(
    () =>
      createExchangeConfig("binance", {
        enabled: "yes" as never,
      }),
    /Enabled must be a boolean/,
  );
});

test("exchange secrets are validated and immutable", () => {
  const secrets = createExchangeSecrets({
    apiKey: "  key  ",
    apiSecret: "  secret  ",
    passphrase: "  pass  ",
  });

  assert.equal(secrets.apiKey, "key");
  assert.equal(secrets.apiSecret, "secret");
  assert.equal(secrets.passphrase, "pass");
  assert.equal(Object.isFrozen(secrets), true);

  assert.throws(
    () =>
      createExchangeSecrets({
        apiKey: "",
        apiSecret: "secret",
      }),
    /API key cannot be empty/,
  );

  assert.throws(
    () =>
      createExchangeSecrets({
        apiKey: "key",
        apiSecret: "   ",
      }),
    /API secret cannot be empty/,
  );

  assert.throws(
    () =>
      createExchangeSecrets({
        apiKey: "key",
        apiSecret: "secret",
        passphrase: "",
      }),
    /Passphrase cannot be empty/,
  );
});

test("credential detection requires both credentials", () => {
  assert.equal(hasExchangeCredentials({ apiKey: "", apiSecret: "" }), false);
  assert.equal(hasExchangeCredentials({ apiKey: "key", apiSecret: "" }), false);
  assert.equal(hasExchangeCredentials({ apiKey: "", apiSecret: "secret" }), false);
  assert.equal(hasExchangeCredentials({ apiKey: "key", apiSecret: "secret" }), true);
  assert.equal(
    hasExchangeCredentials({
      apiKey: "  key  ",
      apiSecret: "  secret  ",
    }),
    true,
  );
});
