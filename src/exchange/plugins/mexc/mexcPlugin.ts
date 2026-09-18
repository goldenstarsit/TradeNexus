import type { ExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import { createExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import type { ExchangeMetadata } from "../../domain/exchangeMetadata";
import { createExchangeMetadata } from "../../domain/exchangeMetadata";
import type { BalanceSnapshot } from "../../balance/balance";
import type { MarketTicker, OrderBook } from "../../market-data/marketData";
import type { Order } from "../../order/order";
import type { TradingSymbol } from "../../domain/symbol";
import type { ExchangePlugin, ExchangeOrderRequest } from "../../plugin/exchangePlugin";
import type { MexcMarketDataClient } from "./mexcMarketData";
import type { MexcAccountClient } from "./mexcAccount";
import type { MexcOrderClient } from "./mexcOrder";

const MEXC_METADATA: ExchangeMetadata = createExchangeMetadata({
  id: "mexc",
  name: "MEXC",
  status: "disabled",
  baseUrl: "https://api.mexc.com",
  marketTypes: ["spot", "futures"],
});

const MEXC_CAPABILITIES: ExchangeCapabilities = createExchangeCapabilities("mexc", [
  "spot",
  "futures",
  "marketOrders",
  "limitOrders",
  "makerOnlyOrders",
  "orderBook",
  "websocketMarketData",
  "websocketUserData",
  "balances",
  "orderHistory",
  "tradeHistory",
  "rateLimits",
]);

export interface MexcPluginClients {
  readonly marketData: MexcMarketDataClient;
  readonly account: MexcAccountClient;
  readonly order: MexcOrderClient;
}

export class MexcPlugin implements ExchangePlugin {
  readonly metadata = MEXC_METADATA;
  readonly capabilities = MEXC_CAPABILITIES;

  constructor(private readonly clients: MexcPluginClients) {}

  async getSymbols(): Promise<readonly TradingSymbol[]> {
    return [];
  }

  async getSymbol(_symbol: string): Promise<TradingSymbol | undefined> {
    return undefined;
  }

  async getTicker(symbol: string): Promise<MarketTicker> {
    return this.clients.marketData.getTicker(symbol);
  }

  async getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    return this.clients.marketData.getOrderBook(symbol, limit);
  }

  async getBalance(asset?: string): Promise<BalanceSnapshot> {
    return this.clients.account.getBalances(asset);
  }

  async getOpenOrders(symbol?: string): Promise<readonly Order[]> {
    return this.clients.order.getOpenOrders(symbol);
  }

  async getOrder(orderId: string, symbol: string): Promise<Order> {
    return this.clients.order.getOrder(orderId, symbol);
  }

  async placeOrder(request: ExchangeOrderRequest): Promise<Order> {
    return this.clients.order.placeOrder(request);
  }

  async cancelOrder(orderId: string, symbol: string): Promise<Order> {
    return this.clients.order.cancelOrder(orderId, symbol);
  }

  async cancelAllOrders(symbol?: string): Promise<readonly Order[]> {
    if (symbol === undefined) {
      throw new Error("MEXC cancelAllOrders requires a symbol");
    }

    return this.clients.order.cancelAllOrders(symbol);
  }
}

export { MEXC_METADATA, MEXC_CAPABILITIES };
