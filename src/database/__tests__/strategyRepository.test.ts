import assert from "node:assert/strict";
import test from "node:test";
import { SQLiteAdapter } from "../adapters/sqliteAdapter";
import { MigrationRunner } from "../migrations/migrationRunner";
import { initialSchemaMigration } from "../migrations/001_initial_schema";
import { strategySchemaMigration } from "../migrations/002_strategy_schema";
import { StrategyRepository, type PersistedStrategy } from "../repositories/strategyRepository";

function createDatabase(): SQLiteAdapter {
  const database = new SQLiteAdapter(":memory:");

  new MigrationRunner(database, [
    initialSchemaMigration,
    strategySchemaMigration,
  ]).run();

  return database;
}

test("strategy schema persists live and test strategies independently", () => {
  const database = createDatabase();
  const repository = new StrategyRepository(database);

  const live = repository.create({
    strategyId: "dca",
    name: "Live BTC DCA",
    balanceMode: "live",
    balanceAccountId: "binance-live",
    exchangeId: "binance",
    marketType: "spot",
    symbol: "BTCUSDT",
    executionMode: "maker-only",
    configurationJson: JSON.stringify({ initialOrder: 100 }),
  });

  const test = repository.create({
    strategyId: "dca",
    name: "Test ETH DCA",
    balanceMode: "test",
    balanceAccountId: "dummy-test",
    exchangeId: "mexc",
    marketType: "spot",
    symbol: "ETHUSDT",
    executionMode: "hybrid",
    configurationJson: JSON.stringify({ initialOrder: 500 }),
  });

  assert.equal(live.balance_mode, "live");
  assert.equal(test.balance_mode, "test");
  assert.equal(repository.count(), 2);

  assert.deepEqual(
    repository.findByBalanceMode("live").map((item) => item.symbol),
    ["BTCUSDT"],
  );

  assert.deepEqual(
    repository.findByBalanceMode("test").map((item) => item.symbol),
    ["ETHUSDT"],
  );

  database.close();
});

test("strategy repository preserves strategy configuration JSON", () => {
  const database = createDatabase();
  const repository = new StrategyRepository(database);

  const configuration = {
    initialOrder: 100,
    dcaOrders: [{ dropPercent: 1 }, { dropPercent: 3 }],
    takeProfit: 2,
    stopLoss: 50,
  };

  const strategy = repository.create({
    strategyId: "dca",
    name: "BTC DCA",
    balanceMode: "test",
    balanceAccountId: "dummy",
    exchangeId: "binance",
    marketType: "spot",
    symbol: "BTCUSDT",
    executionMode: "maker-only",
    configurationJson: JSON.stringify(configuration),
  });

  assert.deepEqual(
    JSON.parse(strategy.configuration_json),
    configuration,
  );

  database.close();
});

test("strategy repository updates status", () => {
  const database = createDatabase();
  const repository = new StrategyRepository(database);

  const strategy = repository.create({
    strategyId: "dca",
    name: "BTC DCA",
    balanceMode: "test",
    balanceAccountId: "dummy",
    exchangeId: "binance",
    marketType: "spot",
    symbol: "BTCUSDT",
    executionMode: "maker-only",
    configurationJson: "{}",
  });

  repository.updateStatus(strategy.id, "paused");

  const updated = repository.findById<PersistedStrategy>(strategy.id);

  assert.equal(updated?.status, "paused");

  database.close();
});

test("strategy repository rejects missing strategy status update", () => {
  const database = createDatabase();
  const repository = new StrategyRepository(database);

  assert.throws(
    () => repository.updateStatus(999, "stopped"),
    /Strategy 999 was not found/,
  );

  database.close();
});
