import type { ExchangeId } from "../exchange/domain/exchangeId";
import type { MarketType } from "../exchange/domain/marketType";
import type { OrderSide } from "../exchange/order/order";
import type { ExchangePlugin } from "../exchange/plugin/exchangePlugin";
import type { ExchangePluginRegistry } from "../exchange/plugin/exchangePluginRegistry";
import type { ExchangeFailoverManager } from "../exchange/failover/exchangeFailoverManager";
import type { SymbolMappingManager } from "../exchange/symbol-mapping/symbolMapping";

export interface TradingOrderRequest {
  readonly symbol: string;
  readonly marketType: MarketType;
  readonly side: OrderSide;
  readonly type: string;
  readonly quantity: number;
  readonly price?: number;
  readonly clientOrderId?: string;
  readonly [key: string]: unknown;
}

export interface ExchangeAgnosticTradingService {
  getActiveExchange(): ExchangeId;
  placeOrder(request: TradingOrderRequest): Promise<unknown>;
  getOrder(
    orderId: string,
    symbol: string,
    marketType: MarketType,
  ): Promise<unknown>;
  getOpenOrders(
    symbol?: string,
    marketType?: MarketType,
  ): Promise<readonly unknown[]>;
  cancelOrder(
    orderId: string,
    symbol: string,
    marketType: MarketType,
  ): Promise<unknown>;
  cancelAllOrders(
    symbol?: string,
    marketType?: MarketType,
  ): Promise<readonly unknown[]>;
}

export interface ExchangeAgnosticTradingServiceOptions {
  readonly registry: ExchangePluginRegistry;
  readonly failover: ExchangeFailoverManager;
  readonly symbolMapping: SymbolMappingManager;
}

function getPlugin(
  registry: ExchangePluginRegistry,
  exchangeId: ExchangeId,
): ExchangePlugin {
  return registry.get(exchangeId);
}

export function createExchangeAgnosticTradingService(
  options: ExchangeAgnosticTradingServiceOptions,
): ExchangeAgnosticTradingService {
  function getActiveExchange(): ExchangeId {
    return options.failover.getActiveExchange();
  }

  function getExchangeSymbol(
    exchangeId: ExchangeId,
    symbol: string,
    marketType: MarketType,
  ): string {
    return options.symbolMapping.getExchangeSymbol(
      symbol,
      exchangeId,
      marketType,
    );
  }

  function buildExchangeRequest(
    request: TradingOrderRequest,
    exchangeId: ExchangeId,
  ): Record<string, unknown> {
    const exchangeSymbol = getExchangeSymbol(
      exchangeId,
      request.symbol,
      request.marketType,
    );

    return {
      ...request,
      symbol: exchangeSymbol,
    };
  }

  return {
    getActiveExchange,

    async placeOrder(request) {
      const exchangeId = getActiveExchange();
      const plugin = getPlugin(options.registry, exchangeId);

      return plugin.placeOrder(
        buildExchangeRequest(request, exchangeId),
      );
    },

    async getOrder(orderId, symbol, marketType) {
      const exchangeId = getActiveExchange();
      const plugin = getPlugin(options.registry, exchangeId);
      const exchangeSymbol = getExchangeSymbol(
        exchangeId,
        symbol,
        marketType,
      );

      return plugin.getOrder(orderId, exchangeSymbol);
    },

    async getOpenOrders(symbol, marketType) {
      const exchangeId = getActiveExchange();
      const plugin = getPlugin(options.registry, exchangeId);

      if (symbol === undefined) {
        return plugin.getOpenOrders();
      }

      if (marketType === undefined) {
        throw new Error(
          "marketType is required when symbol is provided",
        );
      }

      const exchangeSymbol = getExchangeSymbol(
        exchangeId,
        symbol,
        marketType,
      );

      return plugin.getOpenOrders(exchangeSymbol);
    },

    async cancelOrder(orderId, symbol, marketType) {
      const exchangeId = getActiveExchange();
      const plugin = getPlugin(options.registry, exchangeId);
      const exchangeSymbol = getExchangeSymbol(
        exchangeId,
        symbol,
        marketType,
      );

      return plugin.cancelOrder(orderId, exchangeSymbol);
    },

    async cancelAllOrders(symbol, marketType) {
      const exchangeId = getActiveExchange();
      const plugin = getPlugin(options.registry, exchangeId);

      if (symbol === undefined) {
        return plugin.cancelAllOrders();
      }

      if (marketType === undefined) {
        throw new Error(
          "marketType is required when symbol is provided",
        );
      }

      const exchangeSymbol = getExchangeSymbol(
        exchangeId,
        symbol,
        marketType,
      );

      return plugin.cancelAllOrders(exchangeSymbol);
    },
  };
}
