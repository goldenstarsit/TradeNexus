import assert from "node:assert/strict";
import test from "node:test";
import { createBalanceContextProvider } from "../balanceContext";
import { createTestBalanceAccount } from "../testBalanceAccount";

function testContext() {
  return createBalanceContextProvider().getContext("dummy-account", "test");
}

test("test balance account starts with configured dummy balances", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 1000,
    BTC: 0.5,
  });

  assert.deepEqual(account.getBalance("usdt"), {
    asset: "USDT",
    available: 1000,
    reserved: 0,
    total: 1000,
  });

  assert.deepEqual(account.getBalance("btc"), {
    asset: "BTC",
    available: 0.5,
    reserved: 0,
    total: 0.5,
  });
});

test("test balance account supports deposits", () => {
  const account = createTestBalanceAccount(testContext());

  account.deposit("USDT", 500);

  assert.deepEqual(account.getBalance("USDT"), {
    asset: "USDT",
    available: 500,
    reserved: 0,
    total: 500,
  });
});

test("test balance account supports manual withdrawals", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 1000,
  });

  account.withdraw("USDT", 250);

  assert.deepEqual(account.getBalance("USDT"), {
    asset: "USDT",
    available: 750,
    reserved: 0,
    total: 750,
  });
});

test("manual withdrawal cannot consume reserved funds", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 1000,
  });

  account.reserve("USDT", 400);

  account.withdraw("USDT", 600);

  assert.deepEqual(account.getBalance("USDT"), {
    asset: "USDT",
    available: 0,
    reserved: 400,
    total: 400,
  });

  assert.throws(
    () => account.withdraw("USDT", 1),
    /Insufficient available USDT balance/,
  );
});

test("manual withdrawal rejects insufficient available funds", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 100,
  });

  assert.throws(
    () => account.withdraw("USDT", 101),
    /Insufficient available USDT balance/,
  );
});

test("manual withdrawal rejects invalid amounts", () => {
  const account = createTestBalanceAccount(testContext());

  assert.throws(() => account.withdraw("USDT", 0), /greater than zero/);
  assert.throws(() => account.withdraw("USDT", -1), /greater than zero/);
  assert.throws(() => account.withdraw("USDT", Number.NaN), /greater than zero/);
});

test("test balance account reserves and releases funds", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 1000,
  });

  account.reserve("USDT", 250);

  assert.deepEqual(account.getBalance("USDT"), {
    asset: "USDT",
    available: 750,
    reserved: 250,
    total: 1000,
  });

  account.release("USDT", 100);

  assert.deepEqual(account.getBalance("USDT"), {
    asset: "USDT",
    available: 850,
    reserved: 150,
    total: 1000,
  });
});

test("test balance account consumes reserved funds on fill", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 1000,
  });

  account.reserve("USDT", 300);
  account.fill("USDT", 300);

  assert.deepEqual(account.getBalance("USDT"), {
    asset: "USDT",
    available: 700,
    reserved: 0,
    total: 700,
  });
});

test("insufficient available funds are rejected", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 100,
  });

  assert.throws(
    () => account.reserve("USDT", 101),
    /Insufficient available USDT balance/,
  );
});

test("insufficient reserved funds are rejected", () => {
  const account = createTestBalanceAccount(testContext(), {
    USDT: 100,
  });

  account.reserve("USDT", 50);

  assert.throws(
    () => account.release("USDT", 51),
    /Insufficient reserved USDT balance/,
  );

  assert.throws(
    () => account.fill("USDT", 51),
    /Insufficient reserved USDT balance/,
  );
});

test("test balance account rejects live mode", () => {
  const liveContext = createBalanceContextProvider().getContext(
    "live-account",
    "live",
  );

  assert.throws(
    () => createTestBalanceAccount(liveContext),
    /requires test balance mode/,
  );
});

test("invalid balance amounts are rejected", () => {
  const account = createTestBalanceAccount(testContext());

  assert.throws(() => account.deposit("USDT", 0), /greater than zero/);
  assert.throws(() => account.deposit("USDT", -1), /greater than zero/);
  assert.throws(() => account.deposit("USDT", Number.NaN), /greater than zero/);
});
