import type { BalanceContext } from "./balanceContext";

export interface BalanceAmount {
  readonly asset: string;
  readonly available: number;
  readonly reserved: number;
  readonly total: number;
}

export interface BalanceAccount {
  readonly context: BalanceContext;
  getBalance(asset: string): BalanceAmount;
}

export interface BalanceAccountProvider {
  getAccount(context: BalanceContext): BalanceAccount;
}

export function createBalanceAccountProvider(): BalanceAccountProvider {
  return {
    getAccount(context) {
      return {
        context,

        getBalance(asset) {
          const normalizedAsset = asset.trim().toUpperCase();

          if (!normalizedAsset) {
            throw new Error("Balance asset must not be empty");
          }

          throw new Error(
            `Balance account provider has no balance source for ${normalizedAsset}`,
          );
        },
      };
    },
  };
}
