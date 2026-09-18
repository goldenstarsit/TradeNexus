import type { ExchangeId } from "../domain/exchangeId";
import { isExchangeId } from "../domain/exchangeId";
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
    if (!plugin || typeof plugin !== "object") {
      throw new Error("Exchange plugin must be an object");
    }

    if (!plugin.metadata || !isExchangeId(plugin.metadata.id)) {
      throw new Error(
        `Unsupported exchange plugin ID: ${String(plugin?.metadata?.id)}`,
      );
    }

    if (
      !plugin.capabilities ||
      plugin.capabilities.exchangeId !== plugin.metadata.id
    ) {
      throw new Error(
        `Exchange plugin capability ID mismatch: ${plugin.metadata.id}`,
      );
    }

    const marketTypeCapabilities = {
      spot: "spot",
      futures: "futures",
    } as const;

    for (const marketType of plugin.metadata.marketTypes) {
      const capability = marketTypeCapabilities[marketType];

      if (!plugin.capabilities.supports(capability)) {
        throw new Error(
          `Exchange plugin market type capability missing: ${plugin.metadata.id}:${marketType}`,
        );
      }
    }

    for (const marketType of ["spot", "futures"] as const) {
      if (
        plugin.capabilities.supports(marketType) &&
        !plugin.metadata.marketTypes.includes(marketType)
      ) {
        throw new Error(
          `Exchange plugin capability market type mismatch: ${plugin.metadata.id}:${marketType}`,
        );
      }
    }

    const requiredMethods = [
      "getSymbols",
      "getSymbol",
      "getTicker",
      "getOrderBook",
      "getBalance",
      "getOpenOrders",
      "getOrder",
      "placeOrder",
      "cancelOrder",
      "cancelAllOrders",
    ] as const;

    for (const method of requiredMethods) {
      if (typeof plugin[method] !== "function") {
        throw new Error(
          `Exchange plugin method is missing: ${method}`,
        );
      }
    }

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

  return Object.freeze({
    register,

    has(exchangeId: ExchangeId) {
      return registry.has(exchangeId);
    },

    get(exchangeId: ExchangeId) {
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
    });
}
