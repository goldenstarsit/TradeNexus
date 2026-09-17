import type { ExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import { createExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import type { ExchangePlugin } from "../../plugin/exchangePlugin";
import type { ExchangeMetadata } from "../../domain/exchangeMetadata";
import type { TradingSymbol } from "../../domain/symbol";

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

export class BinancePlugin implements ExchangePlugin {
  readonly metadata = BINANCE_METADATA;
  readonly capabilities = BINANCE_CAPABILITIES;

  async getSymbols(): Promise<readonly TradingSymbol[]> {
    return [];
  }

  async getSymbol(_symbol: string): Promise<TradingSymbol | undefined> {
    return undefined;
  }

  async getTicker(_symbol: string): Promise<unknown> {
    throw new Error("Binance market data is not implemented yet");
  }

  async getOrderBook(_symbol: string, _limit?: number): Promise<unknown> {
    throw new Error("Binance market data is not implemented yet");
  }

  async getBalance(_asset?: string): Promise<unknown> {
    throw new Error("Binance account access is not implemented yet");
  }

  async getOpenOrders(_symbol?: string): Promise<readonly unknown[]> {
    throw new Error("Binance order management is not implemented yet");
  }

  async getOrder(_orderId: string, _symbol: string): Promise<unknown> {
    throw new Error("Binance order management is not implemented yet");
  }

  async placeOrder(_request: unknown): Promise<unknown> {
    throw new Error("Binance order management is not implemented yet");
  }

  async cancelOrder(_orderId: string, _symbol: string): Promise<unknown> {
    throw new Error("Binance order management is not implemented yet");
  }

  async cancelAllOrders(_symbol?: string): Promise<readonly unknown[]> {
    throw new Error("Binance order management is not implemented yet");
  }
}

export { BINANCE_METADATA, BINANCE_CAPABILITIES };
