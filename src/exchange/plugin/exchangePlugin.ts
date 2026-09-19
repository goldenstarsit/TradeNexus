import type { BalanceSnapshot } from "../balance/balance";
import type { Fill } from "../fill/fill";
import type { ExchangeCapabilities } from "../capabilities/exchangeCapabilities";
import type { ExchangeMetadata } from "../domain/exchangeMetadata";
import type { TradingSymbol } from "../domain/symbol";
import type { MarketTicker, OrderBook } from "../market-data/marketData";
import type { Order, OrderSide } from "../order/order";
import type { OrderType } from "../order-type/orderType";
import type { ExchangeOrderRequest } from "./exchangeOrderRequest";
export { createExchangeOrderRequest } from "./exchangeOrderRequest";
export type { ExchangeOrderRequest } from "./exchangeOrderRequest";

export interface ExchangePlugin {
  readonly metadata: ExchangeMetadata;
  readonly capabilities: ExchangeCapabilities;

  getSymbols(): Promise<readonly TradingSymbol[]>;
  getSymbol(symbol: string): Promise<TradingSymbol | undefined>;

  getTicker(symbol: string): Promise<MarketTicker>;
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;

  getBalance(asset?: string): Promise<BalanceSnapshot>;

  getOpenOrders(symbol?: string): Promise<readonly Order[]>;
  getOrder(orderId: string, symbol: string): Promise<Order>;
  getOrderFills(orderId: string, symbol: string): Promise<readonly Fill[]>;

  placeOrder(request: ExchangeOrderRequest): Promise<Order>;

  cancelOrder(orderId: string, symbol: string): Promise<Order>;
  cancelAllOrders(symbol?: string): Promise<readonly Order[]>;
}
