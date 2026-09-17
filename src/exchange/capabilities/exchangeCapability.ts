export type ExchangeCapability =
  | "spot"
  | "futures"
  | "marketOrders"
  | "limitOrders"
  | "makerOnlyOrders"
  | "cancelReplace"
  | "orderBook"
  | "websocketMarketData"
  | "websocketUserData"
  | "balances"
  | "orderHistory"
  | "tradeHistory"
  | "rateLimits";
