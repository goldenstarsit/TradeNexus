import type { OrderExecutionMode } from "../order-execution/orderExecutionMode";
import type { OrderSide } from "./order";

export interface OrderIntent {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly quantity?: number;
  readonly executionMode: OrderExecutionMode;
}

export function createOrderIntent(input: {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly quantity?: number;
  readonly executionMode: OrderExecutionMode;
}): OrderIntent {
  if (typeof input.symbol !== "string" || !input.symbol.trim()) {
    throw new Error("Order intent symbol cannot be empty");
  }

  if (input.side !== "buy" && input.side !== "sell") {
    throw new Error(`Unsupported order intent side: ${String(input.side)}`);
  }

  if (
    input.quantity !== undefined &&
    (!Number.isFinite(input.quantity) || input.quantity <= 0)
  ) {
    throw new Error("Order intent quantity must be a finite number greater than zero");
  }

  if (
    input.executionMode !== "makerOnly" &&
    input.executionMode !== "takerOnly" &&
    input.executionMode !== "hybrid"
  ) {
    throw new Error(
      `Unsupported order execution mode: ${String(input.executionMode)}`,
    );
  }

  return Object.freeze({
    symbol: input.symbol.trim().toUpperCase(),
    side: input.side,
    ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
    executionMode: input.executionMode,
  });
}
