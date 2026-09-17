export interface SymbolRules {
  readonly symbol: string;
  readonly priceTickSize: number;
  readonly quantityStepSize: number;
  readonly minQuantity: number;
  readonly maxQuantity?: number;
  readonly minNotional: number;
  readonly maxNotional?: number;
}

export function roundPriceToTick(price: number, tickSize: number): number {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(tickSize) || tickSize <= 0) {
    throw new Error("Invalid price or tick size");
  }
  return Math.floor(price / tickSize + 1e-12) * tickSize;
}

export function roundQuantityToStep(quantity: number, stepSize: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(stepSize) || stepSize <= 0) {
    throw new Error("Invalid quantity or step size");
  }
  return Math.floor(quantity / stepSize + 1e-12) * stepSize;
}

export function isQuantityValid(quantity: number, rules: SymbolRules): boolean {
  if (!Number.isFinite(quantity) || quantity < rules.minQuantity) return false;
  if (rules.maxQuantity !== undefined && quantity > rules.maxQuantity) return false;
  const steps = quantity / rules.quantityStepSize;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function isNotionalValid(price: number, quantity: number, rules: SymbolRules): boolean {
  const notional = price * quantity;
  if (!Number.isFinite(notional) || notional < rules.minNotional) return false;
  return rules.maxNotional === undefined || notional <= rules.maxNotional;
}
