import assert from "node:assert/strict";
import test from "node:test";

import { closeDatabase, getDatabase } from "@/src/database/databaseManager";
import { initializeDatabase } from "@/src/database/databaseInitializer";

import { GET, POST } from "../route";

async function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/strategies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}

async function json(response: Response): Promise<any> {
  return response.json();
}

function uniqueStrategyId(): string {
  return `api-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

test.beforeEach(() => {
  initializeDatabase();
});

test.afterEach(() => {
  const database = getDatabase();
  database.run(
    "DELETE FROM strategies WHERE strategy_id LIKE 'api-test-%'",
  );
  closeDatabase();
});

test("POST /api/strategies persists a strategy", async () => {
  const strategyId = uniqueStrategyId();

  const response = await post({
    strategyId,
    name: "API Test DCA",
    balanceMode: "test",
    balanceAccountId: "api-test-account",
    exchangeId: "mexc",
    marketType: "spot",
    symbol: "BTCUSDT",
    executionMode: "hybrid",
    configuration: {
      initialOrder: 10,
      dcaOrders: [{ dropPercent: 1 }],
      takeProfit: 2,
      stopLoss: 50,
    },
  });

  assert.equal(response.status, 201);

  const body = await json(response);

  assert.equal(body.strategy.strategy_id, strategyId);
  assert.equal(body.strategy.balance_mode, "test");
  assert.equal(body.strategy.exchange_id, "mexc");
  assert.equal(body.strategy.symbol, "BTCUSDT");
  assert.equal(
    JSON.parse(body.strategy.configuration_json).initialOrder,
    10,
  );
});

test("POST /api/strategies rejects an invalid balance mode", async () => {
  const response = await post({
    strategyId: uniqueStrategyId(),
    name: "Invalid Balance Mode",
    balanceMode: "paper",
    balanceAccountId: "api-test-account",
    exchangeId: "mexc",
    marketType: "spot",
    symbol: "BTCUSDT",
    executionMode: "hybrid",
    configuration: {},
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await json(response), {
    error: "Balance mode must be live or test",
  });
});

test("GET /api/strategies returns a persisted strategy", async () => {
  const strategyId = uniqueStrategyId();

  const createResponse = await post({
    strategyId,
    name: "GET Test DCA",
    balanceMode: "live",
    balanceAccountId: "api-test-live-account",
    exchangeId: "binance",
    marketType: "spot",
    symbol: "ETHUSDT",
    executionMode: "maker-only",
    configuration: {
      initialOrder: 20,
    },
  });

  assert.equal(createResponse.status, 201);

  const response = await GET(
    new Request(
      `http://localhost/api/strategies?strategyId=${encodeURIComponent(strategyId)}`,
    ),
  );

  assert.equal(response.status, 200);

  const body = await json(response);

  assert.equal(body.strategies.length, 1);
  assert.equal(body.strategies[0].strategy_id, strategyId);
  assert.equal(body.strategies[0].balance_mode, "live");
  assert.equal(body.strategies[0].symbol, "ETHUSDT");
});

test("GET /api/strategies returns all persisted strategies without a filter", async () => {
  const strategyId = uniqueStrategyId();

  const createResponse = await post({
    strategyId,
    name: "Unfiltered GET Test",
    balanceMode: "test",
    balanceAccountId: "api-test-unfiltered-account",
    exchangeId: "mexc",
    marketType: "spot",
    symbol: "BNBUSDT",
    executionMode: "hybrid",
    configuration: {
      initialOrder: 15,
    },
  });

  assert.equal(createResponse.status, 201);

  const response = await GET(
    new Request("http://localhost/api/strategies"),
  );

  assert.equal(response.status, 200);

  const body = await json(response);
  const strategy = body.strategies.find(
    (item: { strategy_id: string }) => item.strategy_id === strategyId,
  );

  assert.ok(strategy);
  assert.equal(strategy.symbol, "BNBUSDT");
});

test("strategy configuration remains strategy-owned JSON", async () => {
  const strategyId = uniqueStrategyId();

  const configuration = {
    initialOrder: 25,
    dcaOrders: [
      { dropPercent: 1 },
      { dropPercent: 3 },
    ],
    takeProfit: 2,
    stopLoss: 50,
  };

  const response = await post({
    strategyId,
    name: "Configuration Ownership Test",
    balanceMode: "test",
    balanceAccountId: "api-test-config-account",
    exchangeId: "mexc",
    marketType: "spot",
    symbol: "SOLUSDT",
    executionMode: "maker-only",
    configuration,
  });

  assert.equal(response.status, 201);

  const body = await json(response);

  assert.deepEqual(
    JSON.parse(body.strategy.configuration_json),
    configuration,
  );
});
