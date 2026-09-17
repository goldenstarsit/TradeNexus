import type { OrderType } from "./orderType";

export interface OrderTypeDefinition {
  readonly type: OrderType;
  readonly requiresPrice: boolean;
  readonly requiresStopPrice: boolean;
  readonly makerOnly: boolean;
}

export const ORDER_TYPE_DEFINITIONS: Readonly<Record<OrderType, OrderTypeDefinition>> = {
  market: { type: "market", requiresPrice: false, requiresStopPrice: false, makerOnly: false },
  limit: { type: "limit", requiresPrice: true, requiresStopPrice: false, makerOnly: false },
  makerOnly: { type: "makerOnly", requiresPrice: true, requiresStopPrice: false, makerOnly: true },
  stopMarket: { type: "stopMarket", requiresPrice: false, requiresStopPrice: true, makerOnly: false },
  stopLimit: { type: "stopLimit", requiresPrice: true, requiresStopPrice: true, makerOnly: false },
};

export function getOrderTypeDefinition(type: OrderType): OrderTypeDefinition {
  return ORDER_TYPE_DEFINITIONS[type];
}
