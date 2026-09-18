import type { OrderType } from "../order-type/orderType";

export const ORDER_SIDES = ["buy", "sell"] as const;
export type OrderSide = (typeof ORDER_SIDES)[number];

export const ORDER_STATUSES = [
  "new",
  "open",
  "partiallyFilled",
  "filled",
  "canceled",
  "rejected",
  "expired",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  readonly id: string;
  readonly clientOrderId?: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly price?: number;
  readonly quantity: number;
  readonly executedQuantity: number;
  readonly remainingQuantity: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

function normalizeRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function validateNonNegativeFinite(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number`);
  }

  return value;
}

function validateTimestamp(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative timestamp`);
  }

  return value;
}

export function isOrderSide(value: string): value is OrderSide {
  return (ORDER_SIDES as readonly string[]).includes(value);
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function createOrder(input: {
  readonly id: string;
  readonly clientOrderId?: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly price?: number;
  readonly quantity: number;
  readonly executedQuantity: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}): Order {
  const quantity = validateNonNegativeFinite(input.quantity, "Order quantity");
  const executedQuantity = validateNonNegativeFinite(
    input.executedQuantity,
    "Executed quantity",
  );

  if (executedQuantity > quantity) {
    throw new Error("Executed quantity cannot exceed order quantity");
  }

  if (input.price !== undefined) {
    validateNonNegativeFinite(input.price, "Order price");

    if (input.price === 0) {
      throw new Error("Order price must be greater than zero");
    }
  }

  if (input.updatedAt < input.createdAt) {
    throw new Error("Updated timestamp cannot be earlier than created timestamp");
  }

  const clientOrderId =
    input.clientOrderId === undefined
      ? undefined
      : normalizeRequiredString(input.clientOrderId, "Client order ID");

  return Object.freeze({
    id: normalizeRequiredString(input.id, "Order ID"),
    ...(clientOrderId === undefined ? {} : { clientOrderId }),
    exchange: normalizeRequiredString(input.exchange, "Exchange"),
    symbol: normalizeRequiredString(input.symbol, "Symbol").toUpperCase(),
    side: input.side,
    type: input.type,
    status: input.status,
    ...(input.price === undefined ? {} : { price: input.price }),
    quantity,
    executedQuantity,
    remainingQuantity: calculateRemainingQuantity(
      quantity,
      executedQuantity,
    ),
    createdAt: validateTimestamp(input.createdAt, "Created timestamp"),
    updatedAt: validateTimestamp(input.updatedAt, "Updated timestamp"),
  });
}

export function isOrderTerminal(status: OrderStatus): boolean {
  return (
    status === "filled" ||
    status === "canceled" ||
    status === "rejected" ||
    status === "expired"
  );
}

export function calculateRemainingQuantity(
  quantity: number,
  executedQuantity: number,
): number {
  validateNonNegativeFinite(quantity, "Order quantity");
  validateNonNegativeFinite(executedQuantity, "Executed quantity");

  if (executedQuantity > quantity) {
    throw new Error("Executed quantity cannot exceed order quantity");
  }

  const remaining = quantity - executedQuantity;
  return Number(remaining.toPrecision(15));
}
