export const EXCHANGE_IDS = ["binance", "mexc", "htx"] as const;

export type ExchangeId = (typeof EXCHANGE_IDS)[number];

export function isExchangeId(value: string): value is ExchangeId {
  return (EXCHANGE_IDS as readonly string[]).includes(value);
}
