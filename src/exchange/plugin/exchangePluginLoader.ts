import type { ExchangeId } from "../domain/exchangeId";
import type { ExchangePlugin } from "./exchangePlugin";
import {
  createExchangePluginRegistry,
  type ExchangePluginRegistry,
} from "./exchangePluginRegistry";
import { BinancePlugin, type BinancePluginClients } from "../plugins/binance/binancePlugin";
import { MexcPlugin, type MexcPluginClients } from "../plugins/mexc/mexcPlugin";
import { createHtxPlugin, type HtxPluginClients } from "../plugins/htx/htxPlugin";

export interface ExchangePluginLoaderContext {
  readonly binance?: BinancePluginClients;
  readonly mexc?: MexcPluginClients;
  readonly htx?: HtxPluginClients;
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
  mexc: (context) => {
    if (!context?.mexc) {
      throw new Error("MEXC plugin dependencies are required");
    }

    return new MexcPlugin(context.mexc);
  },
  htx: (context) => {
    if (!context?.htx) {
      throw new Error("HTX plugin dependencies are required");
    }

    return createHtxPlugin(context.htx);
  },
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
