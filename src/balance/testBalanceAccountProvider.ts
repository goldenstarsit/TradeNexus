import type {
  BalanceAccount,
  BalanceAccountProvider,
} from "./balanceAccount";
import type { BalanceContext } from "./balanceContext";
import {
  createTestBalanceAccount,
  type TestBalanceAccount,
  type TestBalancePersistence,
  type TestBalanceState,
} from "./testBalanceAccount";

export type TestBalanceInitializer =
  | Record<string, number>
  | ((context: BalanceContext) => Record<string, number>);

export interface TestBalanceLoadedState {
  asset: string;
  available: number;
  reserved: number;
}

export interface TestBalanceAccountProviderOptions {
  initializer?: TestBalanceInitializer;
  load?: (context: BalanceContext) => TestBalanceLoadedState[];
  persist?: TestBalancePersistence;
}

export interface TestBalanceAccountProvider
  extends BalanceAccountProvider {
  getTestAccount(context: BalanceContext): TestBalanceAccount;
}

export function createTestBalanceAccountProvider(
  initializerOrOptions: TestBalanceInitializer | TestBalanceAccountProviderOptions = {},
): TestBalanceAccountProvider {
  const accounts = new Map<string, TestBalanceAccount>();

  const options: TestBalanceAccountProviderOptions =
    typeof initializerOrOptions === "function" ||
    !("initializer" in initializerOrOptions) &&
    !("load" in initializerOrOptions) &&
    !("persist" in initializerOrOptions)
      ? { initializer: initializerOrOptions as TestBalanceInitializer }
      : initializerOrOptions as TestBalanceAccountProviderOptions;

  const initializer = options.initializer ?? {};

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

    const loaded = options.load?.(context) ?? [];

    const loadedBalances: Record<string, number> = {};
    const loadedStates: Record<string, TestBalanceState> = {};

    for (const balance of loaded) {
      loadedBalances[balance.asset] = balance.available;
      loadedStates[balance.asset] = {
        available: balance.available,
        reserved: balance.reserved,
      };
    }

    const configuredBalances = initialBalances(context);
    const hasLoadedBalances = loaded.length > 0;

    const account = createTestBalanceAccount(
      context,
      hasLoadedBalances ? loadedBalances : configuredBalances,
      options.persist,
      loadedStates,
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
