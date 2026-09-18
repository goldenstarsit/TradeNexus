import assert from "node:assert/strict";
import test from "node:test";

import {
  createSymbolMappingManager,
  type SymbolMapping,
} from "../symbolMapping";

const mappings: readonly SymbolMapping[] = [
  {
    canonicalSymbol: "BTC/USDT",
    exchangeId: "binance",
    exchangeSymbol: "BTCUSDT",
    marketType: "spot",
  },
  {
    canonicalSymbol: "BTC/USDT",
    exchangeId: "mexc",
    exchangeSymbol: "BTCUSDT",
    marketType: "spot",
  },
  {
    canonicalSymbol: "BTC/USDT",
    exchangeId: "htx",
    exchangeSymbol: "btcusdt",
    marketType: "spot",
  },
];

test("creates normalized immutable mappings", () => {
  const manager = createSymbolMappingManager(mappings);
  const mapping = manager.get("btc/usdt", "binance", "spot");

  assert.deepEqual(mapping, {
    canonicalSymbol: "BTC/USDT",
    exchangeId: "binance",
    exchangeSymbol: "BTCUSDT",
    marketType: "spot",
  });

  assert.ok(Object.isFrozen(mapping));
  assert.throws(
    () =>
      ((mapping as { exchangeSymbol: string }).exchangeSymbol =
        "ETHUSDT"),
    TypeError,
  );
});

test("supports independent mappings across exchanges", () => {
  const manager = createSymbolMappingManager(mappings);

  assert.equal(manager.has("btc/usdt", "binance", "spot"), true);
  assert.equal(manager.has("BTC/USDT", "mexc", "spot"), true);
  assert.equal(manager.has("BTC/USDT", "htx", "spot"), true);

  assert.equal(
    manager.getExchangeSymbol("BTC/USDT", "binance", "spot"),
    "BTCUSDT",
  );
  assert.equal(
    manager.getExchangeSymbol("BTC/USDT", "mexc", "spot"),
    "BTCUSDT",
  );
  assert.equal(
    manager.getExchangeSymbol("BTC/USDT", "htx", "spot"),
    "BTCUSDT",
  );

  assert.equal(manager.getAll().length, 3);
  assert.equal(manager.getAll("btc/usdt").length, 3);
  assert.ok(Object.isFrozen(manager.getAll()));
  assert.ok(Object.isFrozen(manager.getAll("BTC/USDT")));
});

test("rejects duplicate mappings", () => {
  const manager = createSymbolMappingManager(mappings);

  assert.throws(
    () =>
      manager.register({
        canonicalSymbol: "BTC/USDT",
        exchangeId: "binance",
        exchangeSymbol: "BTCUSDT",
        marketType: "spot",
      }),
    /Symbol mapping already registered: BTC\/USDT -> binance/,
  );
});

test("rejects missing mappings and empty symbols", () => {
  const manager = createSymbolMappingManager(mappings);

  assert.throws(
    () => manager.get("ETH/USDT", "binance", "spot"),
    /Symbol mapping not registered: ETH\/USDT -> binance/,
  );

  assert.throws(
    () =>
      manager.register({
        canonicalSymbol: "   ",
        exchangeId: "binance",
        exchangeSymbol: "BTCUSDT",
        marketType: "spot",
      }),
    /Canonical symbol cannot be empty/,
  );

  assert.throws(
    () =>
      manager.register({
        canonicalSymbol: "BTC/USDT",
        exchangeId: "binance",
        exchangeSymbol: "   ",
        marketType: "spot",
      }),
    /Exchange symbol cannot be empty/,
  );
});

test("rejects unsupported exchange IDs at runtime", () => {
  const manager = createSymbolMappingManager();

  assert.throws(
    () =>
      manager.register({
        canonicalSymbol: "BTC/USDT",
        exchangeId: "kraken" as never,
        exchangeSymbol: "BTCUSDT",
        marketType: "spot",
      }),
    /Unsupported exchange ID: kraken/,
  );

  assert.throws(
    () =>
      manager.has(
        "BTC/USDT",
        "kraken" as never,
        "spot",
      ),
    /Unsupported exchange ID: kraken/,
  );
});

test("rejects unsupported market types at runtime", () => {
  const manager = createSymbolMappingManager();

  assert.throws(
    () =>
      manager.register({
        canonicalSymbol: "BTC/USDT",
        exchangeId: "binance",
        exchangeSymbol: "BTCUSDT",
        marketType: "options" as never,
      }),
    /Unsupported market type: options/,
  );

  assert.throws(
    () =>
      manager.has(
        "BTC/USDT",
        "binance",
        "options" as never,
      ),
    /Unsupported market type: options/,
  );
});

console.log("M60 Multi-Exchange Symbol Mapping verification: OK");
