import type { BalanceAmount } from "../balanceAccount";
import { createBalanceContextProvider } from "../balanceContext";
import { getDatabase } from "@/src/database/databaseManager";
import { initializeDatabase } from "@/src/database/databaseInitializer";
import {
  TestBalanceRepository,
  type PersistedTestBalance,
} from "@/src/database/repositories/testBalanceRepository";
import {
  createTestBalanceAccountProvider,
  type TestBalanceLoadedState,
  type TestBalanceAccountProvider,
} from "../testBalanceAccountProvider";
import type { TestBalanceAccount } from "../testBalanceAccount";

export interface TestBalanceService {
  getTestBalance(accountId: string, asset: string): BalanceAmount;
  depositTestBalance(accountId: string, asset: string, amount: number): BalanceAmount;
  withdrawTestBalance(accountId: string, asset: string, amount: number): BalanceAmount;
  getTestBalanceAccount(accountId: string): TestBalanceAccount;
  getTestBalanceProvider(): TestBalanceAccountProvider;
}

export interface TestBalanceServiceDependencies {
  repository: Pick<TestBalanceRepository, "findByAccount" | "upsert">;
}

export function createTestBalanceService(
  dependencies: TestBalanceServiceDependencies,
): TestBalanceService {
  const contextProvider = createBalanceContextProvider();

  const provider = createTestBalanceAccountProvider({
    load(context): TestBalanceLoadedState[] {
      return dependencies.repository
        .findByAccount(context.accountId)
        .map((balance: PersistedTestBalance) => ({
          asset: balance.asset,
          available: balance.available,
          reserved: balance.reserved,
        }));
    },

    persist(context, asset, state): void {
      dependencies.repository.upsert({
        accountId: context.accountId,
        asset,
        available: state.available,
        reserved: state.reserved,
      });
    },
  });

  function normalizeAccountId(accountId: string): string {
    const normalized = accountId.trim();

    if (!normalized) {
      throw new Error("Balance account ID must not be empty");
    }

    return normalized;
  }

  function getAccount(accountId: string): TestBalanceAccount {
    const normalizedAccountId = normalizeAccountId(accountId);
    const context = contextProvider.getContext(normalizedAccountId, "test");

    return provider.getTestAccount(context);
  }

  return {
    getTestBalance(accountId, asset) {
      return getAccount(accountId).getBalance(asset);
    },

    depositTestBalance(accountId, asset, amount) {
      const account = getAccount(accountId);
      account.deposit(asset, amount);
      return account.getBalance(asset);
    },

    withdrawTestBalance(accountId, asset, amount) {
      const account = getAccount(accountId);
      account.withdraw(asset, amount);
      return account.getBalance(asset);
    },

    getTestBalanceAccount(accountId) {
      return getAccount(accountId);
    },

    getTestBalanceProvider() {
      return provider;
    },
  };
}

initializeDatabase();

const productionRepository = new TestBalanceRepository(getDatabase());

const productionService = createTestBalanceService({
  repository: productionRepository,
});

export const getTestBalance = productionService.getTestBalance;
export const depositTestBalance = productionService.depositTestBalance;
export const withdrawTestBalance = productionService.withdrawTestBalance;
export const getTestBalanceAccount = productionService.getTestBalanceAccount;
export const getTestBalanceProvider = productionService.getTestBalanceProvider;
