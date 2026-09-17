export type OrderSide = "buy" | "sell";
export type OrderStatus = "new" | "open" | "partiallyFilled" | "filled" | "canceled" | "rejected" | "expired";

export interface Order {
  readonly id: string;
  readonly clientOrderId?: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: string;
  readonly status: OrderStatus;
  readonly price?: number;
  readonly quantity: number;
  readonly executedQuantity: number;
  readonly remainingQuantity: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function isOrderTerminal(status: OrderStatus): boolean {
  return status === "filled" || status === "canceled" || status === "rejected" || status === "expired";
}

export function calculateRemainingQuantity(quantity: number, executedQuantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(executedQuantity) || executedQuantity < 0) {
    throw new Error("Invalid order quantity");
  }
  return Math.max(0, quantity - executedQuantity);
}
