import type { ExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import { createExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import type { ExchangeMetadata } from "../../domain/exchangeMetadata";
import { createExchangeMetadata } from "../../domain/exchangeMetadata";
import type { TradingSymbol } from "../../domain/symbol";
import type { BalanceSnapshot } from "../../balance/balance";
import type { MarketTicker, OrderBook } from "../../market-data/marketData";
import type { Order } from "../../order/order";
import type { ExchangePlugin, ExchangeOrderRequest } from "../../plugin/exchangePlugin";
import type { HtxMarketDataClient } from "./htxMarketData";
import type { HtxAccountClient } from "./htxAccount";
import type { HtxOrderClient } from "./htxOrder";

const HTX_METADATA: ExchangeMetadata = createExchangeMetadata({
  id: "htx",
  name: "HTX",
  status: "disabled",
  baseUrl: "https://api.huobi.pro",
  marketTypes: ["spot", "futures"],
});

const HTX_CAPABILITIES: ExchangeCapabilities = createExchangeCapabilities("htx", [
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

export interface HtxPluginClients {
  readonly marketData: HtxMarketDataClient;
  readonly account: HtxAccountClient;
  readonly order: HtxOrderClient;
}

export class HtxPlugin implements ExchangePlugin {
  readonly metadata = HTX_METADATA;
  readonly capabilities = HTX_CAPABILITIES;

  constructor(private readonly clients: HtxPluginClients) {}

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
    return this.clients.order.cancelAllOrders(symbol);
  }
}

export function createHtxPlugin(clients: HtxPluginClients): HtxPlugin {
  return new HtxPlugin(clients);
}

export { HTX_METADATA, HTX_CAPABILITIES };
