import type { BalanceSnapshot } from "../balance/balance";
import type { ExchangeCapabilities } from "../capabilities/exchangeCapabilities";
import type { ExchangeMetadata } from "../domain/exchangeMetadata";
import type { TradingSymbol } from "../domain/symbol";
import type { MarketTicker, OrderBook } from "../market-data/marketData";
import type { Order, OrderSide } from "../order/order";
import type { OrderType } from "../order-type/orderType";

export interface ExchangeOrderRequest {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price?: number;
  readonly clientOrderId?: string;
}

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

  placeOrder(request: ExchangeOrderRequest): Promise<Order>;

  cancelOrder(orderId: string, symbol: string): Promise<Order>;
  cancelAllOrders(symbol?: string): Promise<readonly Order[]>;
}
