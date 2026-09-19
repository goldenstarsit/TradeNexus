import type { StrategyPlugin } from "../plugin";

export const DCA_STRATEGY_ID = "dca";

export interface DCAStrategyPlugin extends StrategyPlugin {
  readonly metadata: {
    readonly id: typeof DCA_STRATEGY_ID;
    readonly name: "Dollar Cost Averaging";
    readonly version: string;
  };
}

export function createDCAStrategyPlugin(
  version = "1.0.0",
): DCAStrategyPlugin {
  return {
    metadata: {
      id: DCA_STRATEGY_ID,
      name: "Dollar Cost Averaging",
      version,
    },
  };
}
