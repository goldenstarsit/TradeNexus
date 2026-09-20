import assert from "node:assert/strict";
import test from "node:test";
import type {
  BalanceAccount,
  BalanceAccountProvider,
} from "../balanceAccount";
import { createBalanceContextProvider } from "../balanceContext";
import { createBalanceAccountProviderRegistry } from "../balanceAccountProviderRegistry";
import { createTestBalanceAccount } from "../testBalanceAccount";

function testProvider(): BalanceAccountProvider {
  return {
    getAccount(context): BalanceAccount {
      return {
        context,
        getBalance(asset) {
          const normalizedAsset = asset.trim().toUpperCase();

          return {
            asset: normalizedAsset,
            available: 0,
            reserved: 0,
            total: 0,
          };
        },
      };
    },
  };
}

test("registry registers and retrieves providers by balance mode", () => {
  const liveProvider = testProvider();
  const testProviderInstance = testProvider();

  const registry = createBalanceAccountProviderRegistry();

  registry.register("live", liveProvider);
  registry.register("test", testProviderInstance);

  assert.equal(registry.has("live"), true);
  assert.equal(registry.has("test"), true);
  assert.equal(registry.get("live"), liveProvider);
  assert.equal(registry.get("test"), testProviderInstance);
});

test("registry routes account lookup using context mode", () => {
  const testAccount = createTestBalanceAccount(
    createBalanceContextProvider().getContext("dummy-account", "test"),
    { USDT: 1000 },
  );

  const testProviderInstance: BalanceAccountProvider = {
    getAccount() {
      return testAccount;
    },
  };

  const registry = createBalanceAccountProviderRegistry({
    test: testProviderInstance,
  });

  const context = createBalanceContextProvider().getContext(
    "dummy-account",
    "test",
  );

  const account = registry.getAccount(context);

  assert.equal(account, testAccount);
  assert.equal(account.context.mode, "test");
});

test("registry rejects duplicate providers", () => {
  const registry = createBalanceAccountProviderRegistry({
    live: testProvider(),
  });

  assert.throws(
    () => registry.register("live", testProvider()),
    /already registered for live mode/,
  );
});

test("registry rejects missing provider lookup", () => {
  const registry = createBalanceAccountProviderRegistry();

  assert.throws(
    () => registry.get("test"),
    /No balance account provider registered for test mode/,
  );
});

test("registry rejects account lookup when provider is missing", () => {
  const registry = createBalanceAccountProviderRegistry();

  const context = createBalanceContextProvider().getContext(
    "dummy-account",
    "test",
  );

  assert.throws(
    () => registry.getAccount(context),
    /No balance account provider registered for test mode/,
  );
});
