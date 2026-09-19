import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "../route";

async function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/test-balances", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}

async function json(response: Response): Promise<unknown> {
  return response.json();
}

test("GET /api/test-balances returns a test balance", async () => {
  const depositResponse = await post({
    accountId: "route-get-account",
    asset: "USDT",
    amount: 1000,
    action: "deposit",
  });

  assert.equal(depositResponse.status, 200);

  const response = await GET(
    new Request(
      "http://localhost/api/test-balances?accountId=route-get-account&asset=USDT",
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), {
    balance: {
      asset: "USDT",
      available: 1000,
      reserved: 0,
      total: 1000,
    },
  });
});

test("POST /api/test-balances deposits balance", async () => {
  const response = await post({
    accountId: "route-deposit-account",
    asset: "USDT",
    amount: 500,
    action: "deposit",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), {
    balance: {
      asset: "USDT",
      available: 500,
      reserved: 0,
      total: 500,
    },
  });
});

test("POST /api/test-balances withdraws balance", async () => {
  await post({
    accountId: "route-withdraw-account",
    asset: "USDT",
    amount: 1000,
    action: "deposit",
  });

  const response = await post({
    accountId: "route-withdraw-account",
    asset: "USDT",
    amount: 250,
    action: "withdraw",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), {
    balance: {
      asset: "USDT",
      available: 750,
      reserved: 0,
      total: 750,
    },
  });
});

test("POST /api/test-balances rejects insufficient withdrawal", async () => {
  await post({
    accountId: "route-insufficient-account",
    asset: "USDT",
    amount: 100,
    action: "deposit",
  });

  const response = await post({
    accountId: "route-insufficient-account",
    asset: "USDT",
    amount: 101,
    action: "withdraw",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await json(response), {
    error: "Insufficient available USDT balance",
  });
});

test("POST /api/test-balances rejects invalid action", async () => {
  const response = await post({
    accountId: "route-invalid-action-account",
    asset: "USDT",
    amount: 100,
    action: "invalid",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await json(response), {
    error: "Balance action must be deposit or withdraw",
  });
});

test("POST /api/test-balances rejects non-numeric amount", async () => {
  const response = await post({
    accountId: "route-invalid-amount-account",
    asset: "USDT",
    amount: "100",
    action: "deposit",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await json(response), {
    error: "Balance amount must be a number",
  });
});

test("GET /api/test-balances rejects empty account ID", async () => {
  const response = await GET(
    new Request(
      "http://localhost/api/test-balances?accountId=&asset=USDT",
    ),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await json(response), {
    error: "Balance account ID must not be empty",
  });
});
