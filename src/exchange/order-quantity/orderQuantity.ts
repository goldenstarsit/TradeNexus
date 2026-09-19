import type { OrderSide } from "../order/order";
import type { SymbolRules } from "../symbol-rules/symbolRules";

export interface OrderQuantityResolutionRequest {
  readonly side: OrderSide;
  readonly requestedQuantity?: number;
  readonly rules: SymbolRules;
  readonly availableBalance: number;
  readonly referencePrice?: number;
}

export interface OrderQuantityResolution {
  readonly quantity: number;
  readonly source: "requested" | "exchangeDefault";
}

function validatePositiveFinite(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite number greater than zero`);
  }

  return value;
}

function validateNonNegativeFinite(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number`);
  }

  return value;
}

function roundUpToStep(quantity: number, stepSize: number): number {
  const steps = Math.ceil(quantity / stepSize - 1e-12);
  return Number((steps * stepSize).toPrecision(15));
}

function roundDownToStep(quantity: number, stepSize: number): number {
  const steps = Math.floor(quantity / stepSize + 1e-12);
  return Number((steps * stepSize).toPrecision(15));
}

function validateReferencePrice(
  referencePrice: number | undefined,
): number {
  if (referencePrice === undefined) {
    throw new Error("Reference price is required");
  }

  return validatePositiveFinite(referencePrice, "Reference price");
}

function validateAvailableBalance(value: number): number {
  return validateNonNegativeFinite(value, "Available balance");
}

export function resolveOrderQuantity(
  input: OrderQuantityResolutionRequest,
): OrderQuantityResolution {
  const availableBalance = validateAvailableBalance(input.availableBalance);

  if (input.requestedQuantity !== undefined) {
    const quantity = validatePositiveFinite(
      input.requestedQuantity,
      "Requested quantity",
    );

    return Object.freeze({
      quantity,
      source: "requested",
    });
  }

  const rules = input.rules;

  if (input.side === "buy") {
    const referencePrice = validateReferencePrice(input.referencePrice);

    const quantityForNotional = rules.minNotional / referencePrice;
    const minimumRequiredQuantity = Math.max(
      rules.minQuantity,
      quantityForNotional,
    );

    const quantity = roundUpToStep(
      minimumRequiredQuantity,
      rules.quantityStepSize,
    );

    if (
      rules.maxQuantity !== undefined &&
      quantity > rules.maxQuantity
    ) {
      throw new Error(
        "Default BUY quantity exceeds the exchange maximum quantity",
      );
    }

    if (
      rules.maxNotional !== undefined &&
      referencePrice * quantity > rules.maxNotional
    ) {
      throw new Error(
        "Default BUY quantity exceeds the exchange maximum notional",
      );
    }

    const requiredQuoteBalance = referencePrice * quantity;

    if (requiredQuoteBalance > availableBalance + 1e-12) {
      throw new Error(
        "Insufficient available quote balance for default BUY quantity",
      );
    }

    return Object.freeze({
      quantity,
      source: "exchangeDefault",
    });
  }

  if (input.side !== "sell") {
    throw new Error(`Unsupported order side: ${String(input.side)}`);
  }

  let maximumQuantity = availableBalance;

  if (rules.maxQuantity !== undefined) {
    maximumQuantity = Math.min(maximumQuantity, rules.maxQuantity);
  }

  if (rules.maxNotional !== undefined) {
    const referencePrice = validateReferencePrice(input.referencePrice);
    maximumQuantity = Math.min(
      maximumQuantity,
      rules.maxNotional / referencePrice,
    );
  }

  const quantity = roundDownToStep(
    maximumQuantity,
    rules.quantityStepSize,
  );

  if (quantity < rules.minQuantity) {
    throw new Error(
      "Available portfolio balance cannot satisfy the exchange minimum SELL quantity",
    );
  }

  if (input.referencePrice !== undefined) {
    if (quantity * input.referencePrice < rules.minNotional) {
      throw new Error(
        "Default SELL quantity cannot satisfy the exchange minimum notional",
      );
    }
  } else if (rules.minNotional > 0) {
    throw new Error(
      "Reference price is required to validate the default SELL minimum notional",
    );
  }

  return Object.freeze({
    quantity,
    source: "exchangeDefault",
  });
}
