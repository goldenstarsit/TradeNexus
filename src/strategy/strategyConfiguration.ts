export interface StrategyConfiguration {
  readonly strategyId: string;
}

export function createStrategyConfiguration(
  strategyId: string,
): StrategyConfiguration {
  const normalizedStrategyId = strategyId.trim();

  if (!normalizedStrategyId) {
    throw new Error("Strategy ID must not be empty");
  }

  return Object.freeze({
    strategyId: normalizedStrategyId,
  });
}
