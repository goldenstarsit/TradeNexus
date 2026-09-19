export interface StrategyPlugin {
  readonly metadata: StrategyMetadata;
}

export interface StrategyMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}
