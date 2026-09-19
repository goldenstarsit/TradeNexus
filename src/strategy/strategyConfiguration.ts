import type { BalanceContext } from "./balanceContext";
import type { BalanceMode } from "./balanceMode";

export interface StrategyConfiguration {
  readonly strategyId: string;
  readonly balanceMode: BalanceMode;
  readonly balanceContext: BalanceContext;
}

export function createStrategyConfiguration(
  strategyId: string,
  balanceContext: BalanceContext,
): StrategyConfiguration {
  const normalizedStrategyId = strategyId.trim();

  if (!normalizedStrategyId) {
    throw new Error("Strategy ID must not be empty");
  }

  return Object.freeze({
    strategyId: normalizedStrategyId,
    balanceMode: balanceContext.mode,
    balanceContext,
  });
}
