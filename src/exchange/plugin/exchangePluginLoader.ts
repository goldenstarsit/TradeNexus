import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangePlugin } from "./exchangePlugin";
import {
  createExchangePluginRegistry,
  type ExchangePluginRegistry,
} from "./exchangePluginRegistry";
import { BinancePlugin, type BinancePluginClients } from "../plugins/binance/binancePlugin";
import { MexcPlugin } from "../plugins/mexc/mexcPlugin";
import { createHtxPlugin } from "../plugins/htx/htxPlugin";

export interface ExchangePluginLoaderContext {
  readonly binance?: BinancePluginClients;
}

export type ExchangePluginFactory = (
  context?: ExchangePluginLoaderContext,
) => ExchangePlugin;

const EXCHANGE_PLUGIN_FACTORIES: Readonly<
  Record<ExchangeId, ExchangePluginFactory>
> = {
  binance: (context) => {
    if (!context?.binance) {
      throw new Error("Binance plugin dependencies are required");
    }

    return new BinancePlugin(context.binance);
  },
  mexc: () => new MexcPlugin(),
  htx: () => createHtxPlugin(),
};

export interface ExchangePluginLoader {
  load(
    exchangeIds: readonly ExchangeId[],
    context?: ExchangePluginLoaderContext,
  ): ExchangePluginRegistry;
}

export function createExchangePluginLoader(): ExchangePluginLoader {
  return {
    load(exchangeIds, context) {
      const plugins = exchangeIds.map((exchangeId) => {
        const factory = EXCHANGE_PLUGIN_FACTORIES[exchangeId];

        if (!factory) {
          throw new Error(
            `Exchange plugin factory not found: ${exchangeId}`,
          );
        }

        return factory(context);
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
