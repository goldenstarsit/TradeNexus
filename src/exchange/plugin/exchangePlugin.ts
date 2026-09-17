import type { ExchangeMetadata } from "../domain/exchangeMetadata";
import type { TradingSymbol } from "../domain/symbol";

export interface ExchangePlugin {
  readonly metadata: ExchangeMetadata;

  getSymbols(): Promise<readonly TradingSymbol[]>;
  getSymbol(symbol: string): Promise<TradingSymbol | undefined>;
  getTicker(symbol: string): Promise<unknown>;
  getOrderBook(symbol: string, limit?: number): Promise<unknown>;
  getBalance(asset?: string): Promise<unknown>;
  getOpenOrders(symbol?: string): Promise<readonly unknown[]>;
  getOrder(orderId: string, symbol: string): Promise<unknown>;
  placeOrder(request: unknown): Promise<unknown>;
  cancelOrder(orderId: string, symbol: string): Promise<unknown>;
  cancelAllOrders(symbol?: string): Promise<readonly unknown[]>;
}
