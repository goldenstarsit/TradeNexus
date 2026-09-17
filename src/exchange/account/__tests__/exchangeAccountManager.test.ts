import assert from "node:assert/strict";
import type { BalanceSnapshot } from "../../balance/balance";
import {
  createExchangeAccountManager,
  type ExchangeAccountClient,
} from "../exchangeAccountManager";

function createAccount(
  exchange: string,
  asset = "USDT",
  free = 100,
): ExchangeAccountClient {
  return {
    async getBalances(requestedAsset) {
      const normalizedAsset = requestedAsset?.trim().toUpperCase();

      const balance = {
        asset,
        free,
        locked: 10,
      };

      const snapshot: BalanceSnapshot = {
        exchange,
        balances: normalizedAsset && normalizedAsset !== asset
          ? []
          : [balance],
        timestamp: 1,
      };

      return snapshot;
    },
  };
}

async function run(): Promise<void> {
  const binance = createAccount("binance", "USDT", 100);
  const mexc = createAccount("mexc", "USDT", 200);
  const htx = createAccount("htx", "USDT", 300);

  const manager = createExchangeAccountManager();

  manager.register("binance", binance);
  manager.register("mexc", mexc);
  manager.register("htx", htx);

  assert.equal(manager.has("binance"), true);
  assert.equal(manager.has("mexc"), true);
  assert.equal(manager.has("htx"), true);

  assert.equal(manager.get("binance"), binance);
  assert.equal(manager.get("mexc"), mexc);
  assert.equal(manager.get("htx"), htx);

  const binanceBalance = await manager.getBalances("binance", "usdt");

  assert.equal(binanceBalance.exchange, "binance");
  assert.equal(binanceBalance.balances[0]?.free, 100);

  const allBalances = await manager.getAllBalances();

  assert.deepEqual(
    allBalances.map((snapshot) => snapshot.exchange),
    ["binance", "mexc", "htx"],
  );

  assert.deepEqual(
    allBalances.map((snapshot) => snapshot.balances[0]?.free),
    [100, 200, 300],
  );

  assert.throws(
    () => manager.register("binance", createAccount("binance")),
    /Exchange account already registered: binance/,
  );

  assert.throws(
    () => manager.get("kraken" as never),
    /Exchange account not registered: kraken/,
  );

  const empty = createExchangeAccountManager();

  assert.equal(empty.has("binance"), false);
  assert.deepEqual(await empty.getAllBalances(), []);

  await assert.rejects(
    () => empty.getBalances("mexc"),
    /Exchange account not registered: mexc/,
  );

  console.log("M59 Multi-Exchange Account Management verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
