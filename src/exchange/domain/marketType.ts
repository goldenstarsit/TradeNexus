export const MARKET_TYPES = ["spot", "futures"] as const;

export type MarketType = (typeof MARKET_TYPES)[number];

export function isMarketType(value: unknown): value is MarketType {
  return (
    typeof value === "string" &&
    (MARKET_TYPES as readonly string[]).includes(value)
  );
}
