import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeCapabilities,
  type ExchangeCapabilities,
} from "../exchangeCapabilities";

test("creates normalized immutable capabilities", () => {
  const capabilities = createExchangeCapabilities("binance", [
    "spot",
    "limitOrders",
    "balances",
    "spot",
  ]);

  assert.equal(capabilities.exchangeId, "binance");
  assert.equal(capabilities.supports("spot"), true);
  assert.equal(capabilities.supports("limitOrders"), true);
  assert.equal(capabilities.supports("balances"), true);
  assert.equal(capabilities.supports("futures"), false);

  assert.equal(capabilities.supported.size, 3);
  assert.deepEqual(
    [...capabilities.supported],
    ["spot", "limitOrders", "balances"],
  );
});

test("capability set is immutable", () => {
  const capabilities = createExchangeCapabilities("binance", [
    "spot",
    "balances",
  ]);

  assert.throws(
    () =>
      (capabilities.supported as Set<never>).add(
        "futures" as never,
      ),
    /Exchange capabilities are immutable/,
  );

  assert.throws(
    () =>
      (capabilities.supported as Set<never>).delete(
        "spot" as never,
      ),
    /Exchange capabilities are immutable/,
  );

  assert.throws(
    () => (capabilities.supported as Set<never>).clear(),
    /Exchange capabilities are immutable/,
  );

  assert.equal(capabilities.supported.has("spot"), true);
  assert.equal(capabilities.supported.has("futures"), false);
});

test("capability object is immutable", () => {
  const capabilities = createExchangeCapabilities("binance", [
    "spot",
  ]);

  assert.throws(
    () => {
      (capabilities as unknown as { exchangeId: string }).exchangeId =
        "mexc";
    },
    TypeError,
  );

  assert.equal(Object.isFrozen(capabilities), true);
});

test("rejects unsupported exchange IDs at runtime", () => {
  assert.throws(
    () =>
      createExchangeCapabilities("kraken" as never, [
        "spot",
      ]),
    /Unsupported exchange ID: kraken/,
  );
});

test("rejects unsupported capabilities at runtime", () => {
  assert.throws(
    () =>
      createExchangeCapabilities("binance", [
        "spot",
        "unknownCapability" as never,
      ]),
    /Unsupported exchange capability: unknownCapability/,
  );
});

test("supports all declared capability types", () => {
  const all = [
    "spot",
    "futures",
    "marketOrders",
    "limitOrders",
    "makerOnlyOrders",
    "cancelReplace",
    "orderBook",
    "websocketMarketData",
    "websocketUserData",
    "balances",
    "orderHistory",
    "tradeHistory",
    "rateLimits",
  ] as const;

  const capabilities = createExchangeCapabilities("mexc", all);

  for (const capability of all) {
    assert.equal(
      capabilities.supports(capability),
      true,
      capability,
    );
  }

  assert.equal(capabilities.supported.size, all.length);
});

test("satisfies the ExchangeCapabilities contract", () => {
  const capabilities: ExchangeCapabilities =
    createExchangeCapabilities("htx", ["spot"]);

  assert.equal(capabilities.supports("spot"), true);
});
