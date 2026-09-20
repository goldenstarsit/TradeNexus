import assert from "node:assert/strict";
import test from "node:test";

import {
  createBalanceAccountProviderRegistry,
  createBalanceContextProvider,
  createStrategyConfiguration,
  createTestBalanceAccountProvider,
} from "../../index";
import { createDCAStrategyBalance } from "../dcaStrategyBalance";

test("DCA balance resolves the configured test balance account", () => {
  const contextProvider = createBalanceContextProvider();
  const balanceContext = contextProvider.getContext("dca-account-1", "test");
  const strategy = createStrategyConfiguration("dca", balanceContext);

  const testProvider = createTestBalanceAccountProvider({
    USDT: 1000,
    BTC: 0.5,
  });

  const providers = createBalanceAccountProviderRegistry({
    test: testProvider,
  });

  const balance = createDCAStrategyBalance(strategy, providers);

  assert.equal(balance.account.context.accountId, "dca-account-1");
  assert.equal(balance.account.context.mode, "test");

  assert.deepEqual(balance.getBalance("USDT"), {
    asset: "USDT",
    available: 1000,
    reserved: 0,
    total: 1000,
  });
});

test("DCA balance uses the configured account and does not mix accounts", () => {
  const contextProvider = createBalanceContextProvider();

  const testProvider = createTestBalanceAccountProvider((context) => ({
    USDT: context.accountId === "account-a" ? 1000 : 250,
  }));

  const providers = createBalanceAccountProviderRegistry({
    test: testProvider,
  });

  const strategyA = createStrategyConfiguration(
    "dca",
    contextProvider.getContext("account-a", "test"),
  );

  const strategyB = createStrategyConfiguration(
    "dca",
    contextProvider.getContext("account-b", "test"),
  );

  const balanceA = createDCAStrategyBalance(strategyA, providers);
  const balanceB = createDCAStrategyBalance(strategyB, providers);

  assert.equal(balanceA.getBalance("USDT").available, 1000);
  assert.equal(balanceB.getBalance("USDT").available, 250);
  assert.notEqual(balanceA.account, balanceB.account);
});

test("DCA balance delegates through the configured provider mode", () => {
  const contextProvider = createBalanceContextProvider();
  const strategy = createStrategyConfiguration(
    "dca",
    contextProvider.getContext("account-1", "live"),
  );

  const liveAccount = {
    context: strategy.balanceContext,
    getBalance(asset: string) {
      return {
        asset: asset.toUpperCase(),
        available: 500,
        reserved: 100,
        total: 600,
      };
    },
  };

  const liveProvider = {
    getAccount() {
      return liveAccount;
    },
  };

  const providers = createBalanceAccountProviderRegistry({
    live: liveProvider,
  });

  const balance = createDCAStrategyBalance(strategy, providers);

  assert.equal(balance.account, liveAccount);
  assert.deepEqual(balance.getBalance("usdt"), {
    asset: "USDT",
    available: 500,
    reserved: 100,
    total: 600,
  });
});

test("DCA balance rejects a non-DCA strategy configuration", () => {
  const contextProvider = createBalanceContextProvider();
  const strategy = createStrategyConfiguration(
    "other-strategy",
    contextProvider.getContext("account-1", "test"),
  );

  const providers = createBalanceAccountProviderRegistry({
    test: createTestBalanceAccountProvider({ USDT: 100 }),
  });

  assert.throws(
    () => createDCAStrategyBalance(strategy, providers),
    /DCA balance requires strategy ID dca/,
  );
});
