import type { OrderSide } from "../order/order";
import type { OrderType } from "../order-type/orderType";
import type { SymbolRules } from "../symbol-rules/symbolRules";

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

export function validateOrderRequest(
  request: OrderValidationRequest,
  rules: SymbolRules,
): OrderValidationResult {
  const errors: string[] = [];

  if (request.symbol.trim().toUpperCase() !== rules.symbol.trim().toUpperCase()) {
    errors.push("Symbol does not match symbol rules");
  }

  if (!Number.isFinite(request.quantity) || request.quantity <= 0) {
    errors.push("Quantity must be greater than zero");
  } else {
    const steps = request.quantity / rules.quantityStepSize;
    if (request.quantity < rules.minQuantity || (rules.maxQuantity !== undefined && request.quantity > rules.maxQuantity) || Math.abs(steps - Math.round(steps)) >= 1e-9) {
      errors.push("Quantity violates symbol rules");
    }
  }

  const requiresPrice = request.type === "limit" || request.type === "makerOnly" || request.type === "stopLimit";
  const requiresStopPrice = request.type === "stopMarket" || request.type === "stopLimit";

  if (requiresPrice && (!Number.isFinite(request.price) || (request.price ?? 0) <= 0)) {
    errors.push("Price is required and must be greater than zero");
  }
  if (!requiresPrice && request.price !== undefined) {
    errors.push("Price is not allowed for this order type");
  }
  if (requiresStopPrice && (!Number.isFinite(request.stopPrice) || (request.stopPrice ?? 0) <= 0)) {
    errors.push("Stop price is required and must be greater than zero");
  }
  if (!requiresStopPrice && request.stopPrice !== undefined) {
    errors.push("Stop price is not allowed for this order type");
  }

  if (request.price !== undefined && Number.isFinite(request.price) && request.price > 0 && request.quantity > 0 && !isNotionalValid(request.price, request.quantity, rules)) {
    errors.push("Order notional violates symbol rules");
  }

  return { valid: errors.length === 0, errors };
}

function isNotionalValid(price: number, quantity: number, rules: SymbolRules): boolean {
  const notional = price * quantity;
  if (!Number.isFinite(notional) || notional < rules.minNotional) return false;
  return rules.maxNotional === undefined || notional <= rules.maxNotional;
}
