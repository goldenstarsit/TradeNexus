import type { BalanceAccount } from "@/src/balance/balanceAccount";
import type { BalanceAccountProviderRegistry } from "@/src/balance/balanceAccountProviderRegistry";
import type { BalanceContext } from "@/src/balance/balanceContext";
import type { BalanceMode } from "@/src/balance/balanceMode";
import { createBalanceContextProvider } from "@/src/balance/balanceContext";
import type { StrategyConfiguration, StrategyPlugin } from "@/src/strategy";

export interface RuntimeCompositionRequest {
  readonly strategy: StrategyPlugin;
  readonly strategyConfiguration: StrategyConfiguration;
  readonly balanceMode: BalanceMode;
  readonly balanceAccountId: string;
}

export interface RuntimeComposition {
  readonly strategy: StrategyPlugin;
  readonly strategyConfiguration: StrategyConfiguration;
  readonly balanceContext: BalanceContext;
  readonly balanceAccount: BalanceAccount;
}

export interface RuntimeComposer {
  compose(request: RuntimeCompositionRequest): RuntimeComposition;
}

export interface RuntimeComposerDependencies {
  readonly balanceContextProvider: {
    getContext(accountId: string, mode: BalanceMode): BalanceContext;
  };
  readonly balanceAccountProviderRegistry: BalanceAccountProviderRegistry;
}

export function createRuntimeComposer(
  dependencies: RuntimeComposerDependencies,
): RuntimeComposer {
  return {
    compose(request) {
      const balanceContext = dependencies.balanceContextProvider.getContext(
        request.balanceAccountId,
        request.balanceMode,
      );

      const balanceAccount =
        dependencies.balanceAccountProviderRegistry.getAccount(balanceContext);

      return Object.freeze({
        strategy: request.strategy,
        strategyConfiguration: request.strategyConfiguration,
        balanceContext,
        balanceAccount,
      });
    },
  };
}

export function createDefaultRuntimeComposer(
  balanceAccountProviderRegistry: BalanceAccountProviderRegistry,
): RuntimeComposer {
  return createRuntimeComposer({
    balanceContextProvider: createBalanceContextProvider(),
    balanceAccountProviderRegistry,
  });
}
