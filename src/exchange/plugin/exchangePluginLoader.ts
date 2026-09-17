import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangePlugin } from "./exchangePlugin";
import {
  createExchangePluginRegistry,
  type ExchangePluginRegistry,
} from "./exchangePluginRegistry";
import { BinancePlugin } from "../plugins/binance/binancePlugin";
import { MexcPlugin } from "../plugins/mexc/mexcPlugin";
import { createHtxPlugin } from "../plugins/htx/htxPlugin";

export type ExchangePluginFactory = () => ExchangePlugin;

const EXCHANGE_PLUGIN_FACTORIES: Readonly<
  Record<ExchangeId, ExchangePluginFactory>
> = {
  binance: () => new BinancePlugin(),
  mexc: () => new MexcPlugin(),
  htx: () => createHtxPlugin(),
};

export interface ExchangePluginLoader {
  load(exchangeIds: readonly ExchangeId[]): ExchangePluginRegistry;
}

export function createExchangePluginLoader(): ExchangePluginLoader {
  return {
    load(exchangeIds) {
      const plugins = exchangeIds.map((exchangeId) => {
        const factory = EXCHANGE_PLUGIN_FACTORIES[exchangeId];

        if (!factory) {
          throw new Error(
            `Exchange plugin factory not found: ${exchangeId}`,
          );
        }

        return factory();
      });

      return createExchangePluginRegistry(plugins);
    },
  };
}

export function getExchangePluginFactory(
  exchangeId: ExchangeId,
): ExchangePluginFactory {
  const factory = EXCHANGE_PLUGIN_FACTORIES[exchangeId];

  if (!factory) {
    throw new Error(
      `Exchange plugin factory not found: ${exchangeId}`,
    );
  }

  return factory;
}
