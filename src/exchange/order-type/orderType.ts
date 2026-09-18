export const ORDER_TYPES = [
  "market",
  "limit",
  "makerOnly",
  "stopMarket",
  "stopLimit",
] as const;

export type OrderType = (typeof ORDER_TYPES)[number];

export function isOrderType(value: string): value is OrderType {
  return (ORDER_TYPES as readonly string[]).includes(value);
}
