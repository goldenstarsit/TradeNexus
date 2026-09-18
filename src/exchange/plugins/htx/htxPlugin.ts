import { createExchangeCapabilities } from "../../capabilities/exchangeCapabilities";
import {
  createExchangeMetadata,
  type ExchangeMetadata,
} from "../../domain/exchangeMetadata";
import type { TradingSymbol } from "../../domain/symbol";
import type { ExchangePlugin } from "../../plugin/exchangePlugin";

const HTX_METADATA: ExchangeMetadata = createExchangeMetadata({
  id: "htx",
  name: "HTX",
  status: "disabled",
  baseUrl: "https://api.huobi.pro",
  marketTypes: ["spot", "futures"],
});
const HTX_CAPABILITIES = createExchangeCapabilities("htx", [
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

function notImplemented(method: string): never {
  throw new Error(`HTX ${method} is not implemented yet`);
}

export function createHtxPlugin(): ExchangePlugin {
  return {
    metadata: HTX_METADATA,
    capabilities: HTX_CAPABILITIES,
    getSymbols: async (): Promise<readonly TradingSymbol[]> => [],
    getSymbol: async (): Promise<TradingSymbol | undefined> => undefined,
    getTicker: async () => notImplemented("getTicker"),
    getOrderBook: async () => notImplemented("getOrderBook"),
    getBalance: async () => notImplemented("getBalance"),
    getOpenOrders: async () => notImplemented("getOpenOrders"),
    getOrder: async () => notImplemented("getOrder"),
    placeOrder: async () => notImplemented("placeOrder"),
    cancelOrder: async () => notImplemented("cancelOrder"),
    cancelAllOrders: async () => notImplemented("cancelAllOrders"),
  };
}

export { HTX_CAPABILITIES };
