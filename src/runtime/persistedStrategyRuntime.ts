import type { PersistedStrategy } from "@/src/database/repositories/strategyRepository";
import type { BalanceMode } from "@/src/balance/balanceMode";
import type { RuntimeComposer, RuntimeComposition } from "./runtimeComposition";
import type { StrategyPluginRegistry } from "@/src/strategy/plugin";
import { createStrategyConfiguration } from "@/src/strategy/strategyConfiguration";

export interface PersistedStrategyRuntimeComposer {
  compose(strategy: PersistedStrategy): RuntimeComposition;
}

export interface PersistedStrategyRuntimeComposerDependencies {
  readonly strategyPluginRegistry: StrategyPluginRegistry;
  readonly runtimeComposer: RuntimeComposer;
}

function toBalanceMode(value: string): BalanceMode {
  if (value !== "live" && value !== "test") {
    throw new Error(`Unsupported balance mode: ${value}`);
  }

  return value;
}

export function createPersistedStrategyRuntimeComposer(
  dependencies: PersistedStrategyRuntimeComposerDependencies,
): PersistedStrategyRuntimeComposer {
  return {
    compose(strategy) {
      const plugin = dependencies.strategyPluginRegistry.get(
        strategy.strategy_id,
      );

      const strategyConfiguration = createStrategyConfiguration(
        strategy.strategy_id,
      );

      return dependencies.runtimeComposer.compose({
        strategy: plugin,
        strategyConfiguration,
        balanceMode: toBalanceMode(strategy.balance_mode),
        balanceAccountId: strategy.balance_account_id,
      });
    },
  };
}
