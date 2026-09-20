import assert from "node:assert/strict";
import test from "node:test";
import { createBalanceContextProvider } from "../balanceContext";
import { createBalanceAccountProvider } from "../balanceAccount";

test("balance account preserves its balance context", () => {
  const context = createBalanceContextProvider().getContext(
    "binance-live",
    "live",
  );

  const account = createBalanceAccountProvider().getAccount(context);

  assert.equal(account.context, context);
  assert.equal(account.context.mode, "live");
  assert.equal(account.context.accountId, "binance-live");
});

test("test balance account preserves test context", () => {
  const context = createBalanceContextProvider().getContext(
    "binance-test",
    "test",
  );

  const account = createBalanceAccountProvider().getAccount(context);

  assert.equal(account.context.mode, "test");
  assert.equal(account.context.accountId, "binance-test");
});

test("balance accounts remain separated by context", () => {
  const contexts = createBalanceContextProvider();

  const live = contexts.getContext("account-1", "live");
  const testMode = contexts.getContext("account-1", "test");

  const accounts = createBalanceAccountProvider();

  const liveAccount = accounts.getAccount(live);
  const testAccount = accounts.getAccount(testMode);

  assert.notEqual(liveAccount, testAccount);
  assert.notEqual(liveAccount.context, testAccount.context);
  assert.equal(liveAccount.context.mode, "live");
  assert.equal(testAccount.context.mode, "test");
});

test("balance asset names are normalized before lookup", () => {
  const context = createBalanceContextProvider().getContext(
    "account-1",
    "test",
  );

  const account = createBalanceAccountProvider().getAccount(context);

  assert.throws(
    () => account.getBalance(" usdt "),
    /USDT/,
  );
});

test("empty balance asset names are rejected", () => {
  const context = createBalanceContextProvider().getContext(
    "account-1",
    "test",
  );

  const account = createBalanceAccountProvider().getAccount(context);

  assert.throws(
    () => account.getBalance("   "),
    /Balance asset must not be empty/,
  );
});
