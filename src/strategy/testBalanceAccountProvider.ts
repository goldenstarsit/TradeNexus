import type {
  BalanceAccount,
  BalanceAccountProvider,
} from "./balanceAccount";
import type { BalanceContext } from "./balanceContext";
import {
  createTestBalanceAccount,
  type TestBalanceAccount,
} from "./testBalanceAccount";

export type TestBalanceInitializer =
  | Record<string, number>
  | ((context: BalanceContext) => Record<string, number>);

export interface TestBalanceAccountProvider
  extends BalanceAccountProvider {
  getTestAccount(context: BalanceContext): TestBalanceAccount;
}

export function createTestBalanceAccountProvider(
  initializer: TestBalanceInitializer = {},
): TestBalanceAccountProvider {
  const accounts = new Map<string, TestBalanceAccount>();

  function initialBalances(
    context: BalanceContext,
  ): Record<string, number> {
    return typeof initializer === "function"
      ? initializer(context)
      : initializer;
  }

  function getTestAccount(context: BalanceContext): TestBalanceAccount {
    if (context.mode !== "test") {
      throw new Error("Test balance provider requires test balance mode");
    }

    const existing = accounts.get(context.accountId);

    if (existing) {
      return existing;
    }

    const account = createTestBalanceAccount(
      context,
      initialBalances(context),
    );

    accounts.set(context.accountId, account);

    return account;
  }

  return {
    getAccount(context): BalanceAccount {
      return getTestAccount(context);
    },

    getTestAccount,
  };
}
