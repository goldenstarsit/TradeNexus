export interface SymbolRules {
  readonly symbol: string;
  readonly priceTickSize: number;
  readonly quantityStepSize: number;
  readonly minQuantity: number;
  readonly maxQuantity?: number;
  readonly minNotional: number;
  readonly maxNotional?: number;
}

function normalizeSymbol(value: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Symbol cannot be empty");
  }

  return value.trim().toUpperCase();
}

function validatePositiveFinite(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite number greater than zero`);
  }

  return value;
}

export function createSymbolRules(input: {
  readonly symbol: string;
  readonly priceTickSize: number;
  readonly quantityStepSize: number;
  readonly minQuantity: number;
  readonly maxQuantity?: number;
  readonly minNotional: number;
  readonly maxNotional?: number;
}): SymbolRules {
  const priceTickSize = validatePositiveFinite(
    input.priceTickSize,
    "Price tick size",
  );
  const quantityStepSize = validatePositiveFinite(
    input.quantityStepSize,
    "Quantity step size",
  );
  const minQuantity = validatePositiveFinite(
    input.minQuantity,
    "Minimum quantity",
  );
  const minNotional = validatePositiveFinite(
    input.minNotional,
    "Minimum notional",
  );

  const maxQuantity =
    input.maxQuantity === undefined
      ? undefined
      : validatePositiveFinite(input.maxQuantity, "Maximum quantity");

  const maxNotional =
    input.maxNotional === undefined
      ? undefined
      : validatePositiveFinite(input.maxNotional, "Maximum notional");

  if (maxQuantity !== undefined && maxQuantity < minQuantity) {
    throw new Error("Maximum quantity cannot be less than minimum quantity");
  }

  if (maxNotional !== undefined && maxNotional < minNotional) {
    throw new Error("Maximum notional cannot be less than minimum notional");
  }

  return Object.freeze({
    symbol: normalizeSymbol(input.symbol),
    priceTickSize,
    quantityStepSize,
    minQuantity,
    ...(maxQuantity === undefined ? {} : { maxQuantity }),
    minNotional,
    ...(maxNotional === undefined ? {} : { maxNotional }),
  });
}

export function roundPriceToTick(price: number, tickSize: number): number {
  validatePositiveFinite(price, "Price");
  validatePositiveFinite(tickSize, "Tick size");

  return Math.floor(price / tickSize + 1e-12) * tickSize;
}

export function roundQuantityToStep(quantity: number, stepSize: number): number {
  validatePositiveFinite(quantity, "Quantity");
  validatePositiveFinite(stepSize, "Step size");

  return Math.floor(quantity / stepSize + 1e-12) * stepSize;
}

export function isQuantityValid(
  quantity: number,
  rules: SymbolRules,
): boolean {
  if (!Number.isFinite(quantity) || quantity < rules.minQuantity) {
    return false;
  }

  if (
    rules.maxQuantity !== undefined &&
    quantity > rules.maxQuantity
  ) {
    return false;
  }

  const steps = quantity / rules.quantityStepSize;

  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function isNotionalValid(
  price: number,
  quantity: number,
  rules: SymbolRules,
): boolean {
  const notional = price * quantity;

  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(notional) ||
    notional < rules.minNotional
  ) {
    return false;
  }

  return rules.maxNotional === undefined || notional <= rules.maxNotional;
}
