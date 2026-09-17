export type OrderType =
  | "market"
  | "limit"
  | "makerOnly"
  | "stopMarket"
  | "stopLimit";

export function isOrderType(value: string): value is OrderType {
  return ["market", "limit", "makerOnly", "stopMarket", "stopLimit"].includes(value);
}
