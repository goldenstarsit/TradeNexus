import {
  isOrderSide,
  type OrderSide,
} from "../order/order";
import {
  isOrderType,
  type OrderType,
} from "../order-type/orderType";

export interface ExchangeOrderRequest {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price?: number;
  readonly stopPrice?: number;
  readonly clientOrderId?: string;
}

function normalizeRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function normalizeSymbol(value: string): string {
  return normalizeRequiredString(value, "Symbol").toUpperCase();
}

function validatePositiveFinite(
  value: number,
  field: string,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite number greater than zero`);
  }

  return value;
}

function validateOptionalPositiveFinite(
  value: number | undefined,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validatePositiveFinite(value, field);
}

export function createExchangeOrderRequest(input: {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price?: number;
  readonly stopPrice?: number;
  readonly clientOrderId?: string;
}): ExchangeOrderRequest {
  if (!isOrderSide(input.side)) {
    throw new Error(`Unsupported order side: ${String(input.side)}`);
  }

  if (!isOrderType(input.type)) {
    throw new Error(`Unsupported order type: ${String(input.type)}`);
  }

  const price = validateOptionalPositiveFinite(input.price, "Price");
  const stopPrice = validateOptionalPositiveFinite(
    input.stopPrice,
    "Stop price",
  );

  const clientOrderId =
    input.clientOrderId === undefined
      ? undefined
      : normalizeRequiredString(
          input.clientOrderId,
          "Client order ID",
        );

  return Object.freeze({
    symbol: normalizeSymbol(input.symbol),
    side: input.side,
    type: input.type,
    quantity: validatePositiveFinite(input.quantity, "Quantity"),
    ...(price === undefined ? {} : { price }),
    ...(stopPrice === undefined ? {} : { stopPrice }),
    ...(clientOrderId === undefined ? {} : { clientOrderId }),
  });
}
