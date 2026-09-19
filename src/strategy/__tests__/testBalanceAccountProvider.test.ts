import assert from "node:assert/strict";
import test from "node:test";
import { createBalanceContextProvider } from "../balanceContext";
import { createBalanceAccountProviderRegistry } from "../balanceAccountProviderRegistry";
import { createTestBalanceAccountProvider } from "../testBalanceAccountProvider";

test("test balance provider creates and caches a dummy account", () => {
  const provider = createTestBalanceAccountProvider({
    USDT: 1000,
  });

  const context = createBalanceContextProvider().getContext(
    "dummy-account",
    "test",
  );

  const first = provider.getTestAccount(context);
  const second = provider.getTestAccount(context);

  assert.equal(first, second);
  assert.deepEqual(first.getBalance("USDT"), {
    asset: "USDT",
    available: 1000,
    reserved: 0,
    total: 1000,
  });
});

test("test balance provider keeps accounts separate by account ID", () => {
  const provider = createTestBalanceAccountProvider({
    USDT: 1000,
  });

  const contexts = createBalanceContextProvider();

  const first = provider.getTestAccount(
    contexts.getContext("account-a", "test"),
  );
  const second = provider.getTestAccount(
    contexts.getContext("account-b", "test"),
  );

  assert.notEqual(first, second);

  first.deposit("USDT", 500);

  assert.equal(first.getBalance("USDT").total, 1500);
  assert.equal(second.getBalance("USDT").total, 1000);
});

test("test balance provider supports context-specific initialization", () => {
  const provider = createTestBalanceAccountProvider((context) => ({
    USDT: context.accountId === "account-a" ? 1000 : 250,
  }));

  const contexts = createBalanceContextProvider();

  const first = provider.getTestAccount(
    contexts.getContext("account-a", "test"),
  );
  const second = provider.getTestAccount(
    contexts.getContext("account-b", "test"),
  );

  assert.equal(first.getBalance("USDT").total, 1000);
  assert.equal(second.getBalance("USDT").total, 250);
});

test("test balance provider rejects live context", () => {
  const provider = createTestBalanceAccountProvider();
  const context = createBalanceContextProvider().getContext(
    "live-account",
    "live",
  );

  assert.throws(
    () => provider.getAccount(context),
    /requires test balance mode/,
  );
});

test("registry routes test mode to the test balance provider", () => {
  const provider = createTestBalanceAccountProvider({
    USDT: 5000,
  });

  const registry = createBalanceAccountProviderRegistry({
    test: provider,
  });

  const context = createBalanceContextProvider().getContext(
    "dummy-account",
    "test",
  );

  const account = registry.getAccount(context);

  assert.equal(account.context.mode, "test");
  assert.equal(account.getBalance("USDT").total, 5000);
});
