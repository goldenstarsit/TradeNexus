import assert from "node:assert/strict";
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

async function run(): Promise<void> {
  const manager = createSymbolMappingManager(mappings);

  assert.equal(
    manager.has("btc/usdt", "binance", "spot"),
    true,
  );
  assert.equal(
    manager.has("BTC/USDT", "mexc", "spot"),
    true,
  );
  assert.equal(
    manager.has("BTC/USDT", "htx", "spot"),
    true,
  );

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
    /Symbol cannot be empty/,
  );

  console.log("M60 Multi-Exchange Symbol Mapping verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
