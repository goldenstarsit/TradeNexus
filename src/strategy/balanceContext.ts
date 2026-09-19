import type { BalanceMode } from "./balanceMode";

export interface BalanceContext {
  readonly mode: BalanceMode;
  readonly accountId: string;
}

export interface BalanceContextProvider {
  getContext(accountId: string, mode: BalanceMode): BalanceContext;
}

export function createBalanceContextProvider(): BalanceContextProvider {
  return {
    getContext(accountId, mode) {
      const normalizedAccountId = accountId.trim();

      if (!normalizedAccountId) {
        throw new Error("Balance account ID must not be empty");
      }

      return Object.freeze({
        mode,
        accountId: normalizedAccountId,
      });
    },
  };
}
