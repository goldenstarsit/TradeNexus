import type { BalanceAccount, BalanceAmount } from "../balanceAccount";
import type { BalanceAccountProviderRegistry } from "../balanceAccountProviderRegistry";
import type { StrategyConfiguration } from "../strategyConfiguration";

export interface DCAStrategyBalance {
  readonly strategy: StrategyConfiguration;
  readonly account: BalanceAccount;
  getBalance(asset: string): BalanceAmount;
}

export function createDCAStrategyBalance(
  strategy: StrategyConfiguration,
  balanceProviders: BalanceAccountProviderRegistry,
): DCAStrategyBalance {
  if (strategy.strategyId !== "dca") {
    throw new Error(
      `DCA balance requires strategy ID dca, received ${strategy.strategyId}`,
    );
  }

  const account = balanceProviders.getAccount(strategy.balanceContext);

  return {
    strategy,
    account,
    getBalance(asset) {
      return account.getBalance(asset);
    },
  };
}
