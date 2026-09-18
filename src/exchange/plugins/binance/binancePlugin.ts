import type { ExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import { createExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import type { ExchangePlugin, ExchangeOrderRequest } from "../../plugin/exchangePlugin";
import type { ExchangeMetadata } from "../../domain/exchangeMetadata";
import type { TradingSymbol } from "../../domain/symbol";
import type { MarketTicker, OrderBook } from "../../market-data/marketData";
import type { BalanceSnapshot } from "../../balance/balance";
import type { Order } from "../../order/order";
import type { BinanceMarketDataClient } from "./binanceMarketData";
import type { BinanceAccountClient } from "./binanceAccount";
import type { BinanceOrderClient } from "./binanceOrder";

const BINANCE_METADATA: ExchangeMetadata = {
  id: "binance",
  name: "Binance",
  status: "disabled",
  baseUrl: "https://api.binance.com",
  marketTypes: ["spot", "futures"],
};

const BINANCE_CAPABILITIES: ExchangeCapabilities = createExchangeCapabilities("binance", [
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

export interface BinancePluginClients {
  readonly marketData: BinanceMarketDataClient;
  readonly account: BinanceAccountClient;
  readonly order: BinanceOrderClient;
}

export class BinancePlugin implements ExchangePlugin {
  readonly metadata = BINANCE_METADATA;
  readonly capabilities = BINANCE_CAPABILITIES;

  constructor(private readonly clients: BinancePluginClients) {}

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

export { BINANCE_METADATA, BINANCE_CAPABILITIES };
