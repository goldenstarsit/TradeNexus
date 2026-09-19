import type { StrategyPlugin } from "./strategyPlugin";

export interface StrategyPluginRegistry {
  register(plugin: StrategyPlugin): void;
  get(strategyId: string): StrategyPlugin;
  has(strategyId: string): boolean;
  list(): readonly StrategyPlugin[];
}

export function createStrategyPluginRegistry(
  plugins: readonly StrategyPlugin[] = [],
): StrategyPluginRegistry {
  const registry = new Map<string, StrategyPlugin>();

  function register(plugin: StrategyPlugin): void {
    if (!plugin || typeof plugin !== "object") {
      throw new Error("Strategy plugin must be an object");
    }

    const id = plugin.metadata?.id;

    if (typeof id !== "string" || !id.trim()) {
      throw new Error("Strategy plugin ID cannot be empty");
    }

    if (registry.has(id)) {
      throw new Error(`Strategy plugin already registered: ${id}`);
    }

    registry.set(id, plugin);
  }

  function get(strategyId: string): StrategyPlugin {
    const plugin = registry.get(strategyId);

    if (!plugin) {
      throw new Error(`Strategy plugin not registered: ${strategyId}`);
    }

    return plugin;
  }

  function has(strategyId: string): boolean {
    return registry.has(strategyId);
  }

  function list(): readonly StrategyPlugin[] {
    return Object.freeze([...registry.values()]);
  }

  for (const plugin of plugins) {
    register(plugin);
  }

  return Object.freeze({
    register,
    get,
    has,
    list,
  });
}
