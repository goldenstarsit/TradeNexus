import type { BalanceSnapshot } from "../../balance/balance";
import type { ExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import { createExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import type { ExchangeMetadata } from "../../domain/exchangeMetadata";
import type { TradingSymbol } from "../../domain/symbol";
import type { MarketTicker, OrderBook } from "../../market-data/marketData";
import type { Order } from "../../order/order";
import type {
  ExchangeOrderRequest,
  ExchangePlugin,
} from "../../plugin/exchangePlugin";

const MEXC_METADATA: ExchangeMetadata = {
  id: "mexc",
  name: "MEXC",
  status: "disabled",
  baseUrl: "https://api.mexc.com",
  marketTypes: ["spot", "futures"],
};

const MEXC_CAPABILITIES: ExchangeCapabilities =
  createExchangeCapabilities("mexc", [
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

export class MexcPlugin implements ExchangePlugin {
  readonly metadata = MEXC_METADATA;
  readonly capabilities = MEXC_CAPABILITIES;

  async getSymbols(): Promise<readonly TradingSymbol[]> {
    return [];
  }

  async getSymbol(
    _symbol: string,
  ): Promise<TradingSymbol | undefined> {
    return undefined;
  }

  async getTicker(_symbol: string): Promise<MarketTicker> {
    throw new Error("MEXC getTicker is not implemented yet");
  }

  async getOrderBook(
    _symbol: string,
    _limit?: number,
  ): Promise<OrderBook> {
    throw new Error("MEXC getOrderBook is not implemented yet");
  }

  async getBalance(
    _asset?: string,
  ): Promise<BalanceSnapshot> {
    throw new Error("MEXC getBalance is not implemented yet");
  }

  async getOpenOrders(
    _symbol?: string,
  ): Promise<readonly Order[]> {
    throw new Error("MEXC getOpenOrders is not implemented yet");
  }

  async getOrder(
    _orderId: string,
    _symbol: string,
  ): Promise<Order> {
    throw new Error("MEXC getOrder is not implemented yet");
  }

  async placeOrder(
    _request: ExchangeOrderRequest,
  ): Promise<Order> {
    throw new Error("MEXC placeOrder is not implemented yet");
  }

  async cancelOrder(
    _orderId: string,
    _symbol: string,
  ): Promise<Order> {
    throw new Error("MEXC cancelOrder is not implemented yet");
  }

  async cancelAllOrders(
    _symbol?: string,
  ): Promise<readonly Order[]> {
    throw new Error("MEXC cancelAllOrders is not implemented yet");
  }
}

export {
  MEXC_METADATA,
  MEXC_CAPABILITIES,
};
