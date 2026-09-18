import {
  isOrderSide,
  type OrderSide,
} from "../order/order";
import {
  isOrderType,
  type OrderType,
} from "../order-type/orderType";
import { getOrderTypeDefinition } from "../order-type/orderTypeDefinition";
import {
  isNotionalValid,
  isQuantityValid,
  type SymbolRules,
} from "../symbol-rules/symbolRules";

export interface OrderValidationRequest {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price?: number;
  readonly stopPrice?: number;
}

export interface OrderValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function isTickAligned(value: number, tickSize: number): boolean {
  const steps = value / tickSize;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

function isStepAligned(value: number, stepSize: number): boolean {
  const steps = value / stepSize;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function validateOrderRequest(
  request: OrderValidationRequest,
  rules: SymbolRules,
): OrderValidationResult {
  const errors: string[] = [];

  if (
    typeof request.symbol !== "string" ||
    !request.symbol.trim()
  ) {
    errors.push("Symbol cannot be empty");
  } else if (
    request.symbol.trim().toUpperCase() !==
    rules.symbol.trim().toUpperCase()
  ) {
    errors.push("Symbol does not match symbol rules");
  }

  if (!isOrderSide(request.side)) {
    errors.push(`Unsupported order side: ${String(request.side)}`);
  }

  if (!isOrderType(request.type)) {
    errors.push(`Unsupported order type: ${String(request.type)}`);
  }

  if (!Number.isFinite(request.quantity) || request.quantity <= 0) {
    errors.push("Quantity must be greater than zero");
  } else if (!isQuantityValid(request.quantity, rules)) {
    errors.push("Quantity violates symbol rules");
  }

  const orderTypeDefinition = isOrderType(request.type)
    ? getOrderTypeDefinition(request.type)
    : undefined;

  const requiresPrice = orderTypeDefinition?.requiresPrice ?? false;
  const requiresStopPrice = orderTypeDefinition?.requiresStopPrice ?? false;

  if (requiresPrice && !isPositiveFinite(request.price)) {
    errors.push("Price is required and must be greater than zero");
  }

  if (!requiresPrice && request.price !== undefined) {
    errors.push("Price is not allowed for this order type");
  }

  if (
    isPositiveFinite(request.price) &&
    !isTickAligned(request.price, rules.priceTickSize)
  ) {
    errors.push("Price violates price tick size");
  }

  if (requiresStopPrice && !isPositiveFinite(request.stopPrice)) {
    errors.push(
      "Stop price is required and must be greater than zero",
    );
  }

  if (!requiresStopPrice && request.stopPrice !== undefined) {
    errors.push("Stop price is not allowed for this order type");
  }

  if (
    isPositiveFinite(request.stopPrice) &&
    !isTickAligned(request.stopPrice, rules.priceTickSize)
  ) {
    errors.push("Stop price violates price tick size");
  }

  if (
    isPositiveFinite(request.price) &&
    Number.isFinite(request.quantity) &&
    request.quantity > 0 &&
    !isNotionalValid(request.price, request.quantity, rules)
  ) {
    errors.push("Order notional violates symbol rules");
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
