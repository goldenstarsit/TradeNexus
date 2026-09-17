import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangePlugin } from "./exchangePlugin";

export interface ExchangePluginRegistry {
  register(plugin: ExchangePlugin): void;
  has(exchangeId: ExchangeId): boolean;
  get(exchangeId: ExchangeId): ExchangePlugin;
  getAll(): readonly ExchangePlugin[];
}

export function createExchangePluginRegistry(
  plugins: readonly ExchangePlugin[] = [],
): ExchangePluginRegistry {
  const registry = new Map<ExchangeId, ExchangePlugin>();

  function register(plugin: ExchangePlugin): void {
    const exchangeId = plugin.metadata.id;

    if (registry.has(exchangeId)) {
      throw new Error(
        `Exchange plugin already registered: ${exchangeId}`,
      );
    }

    registry.set(exchangeId, plugin);
  }

  for (const plugin of plugins) {
    register(plugin);
  }

  return {
    register,

    has(exchangeId) {
      return registry.has(exchangeId);
    },

    get(exchangeId) {
      const plugin = registry.get(exchangeId);

      if (!plugin) {
        throw new Error(
          `Exchange plugin not registered: ${exchangeId}`,
        );
      }

      return plugin;
    },

    getAll() {
      return Object.freeze([...registry.values()]);
    },
  };
}
