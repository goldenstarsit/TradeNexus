import type { ExchangeOrderRequest } from "../plugin/exchangeOrderRequest";
import type { Order } from "../order/order";

export interface ExchangeCancelReplaceRequest {
  readonly orderId: string;
  readonly symbol: string;
  readonly replacement: ExchangeOrderRequest;
}

export interface ExchangeCancelReplaceClient {
  cancelReplaceOrder(
    request: ExchangeCancelReplaceRequest,
  ): Promise<Order>;
}

function normalizeRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

export function createExchangeCancelReplaceRequest(input: {
  readonly orderId: string;
  readonly symbol: string;
  readonly replacement: ExchangeOrderRequest;
}): ExchangeCancelReplaceRequest {
  if (!input.replacement || typeof input.replacement !== "object") {
    throw new Error("Replacement order request is required");
  }

  const orderId = normalizeRequiredString(input.orderId, "Order ID");
  const symbol = normalizeRequiredString(input.symbol, "Symbol").toUpperCase();

  if (input.replacement.symbol !== symbol) {
    throw new Error(
      "Replacement order symbol must match cancel-replace symbol",
    );
  }

  return Object.freeze({
    orderId,
    symbol,
    replacement: Object.freeze({ ...input.replacement }),
  });
}
