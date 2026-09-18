export const FILL_SIDES = ["buy", "sell"] as const;
export type FillSide = (typeof FILL_SIDES)[number];
export type FeeAsset = string;

function normalizeRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function normalizeSymbol(value: string): string {
  return normalizeRequiredString(value, "Symbol").toUpperCase();
}

function validateNonNegativeFinite(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number`);
  }

  return value;
}

function validateTimestamp(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Timestamp must be a finite non-negative number");
  }

  return value;
}

export function isFillSide(value: string): value is FillSide {
  return (FILL_SIDES as readonly string[]).includes(value);
}

export function createFill(input: {
  readonly id: string;
  readonly orderId: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly side: FillSide;
  readonly price: number;
  readonly quantity: number;
  readonly quoteQuantity?: number;
  readonly fee: number;
  readonly feeAsset: FeeAsset;
  readonly timestamp: number;
}): Fill {
  if (!isFillSide(input.side)) {
    throw new Error(`Unsupported fill side: ${String(input.side)}`);
  }

  const price = validateNonNegativeFinite(input.price, "Fill price");
  const quantity = validateNonNegativeFinite(input.quantity, "Fill quantity");
  const fee = validateNonNegativeFinite(input.fee, "Fill fee");

  const calculatedQuoteQuantity = calculateQuoteQuantity(price, quantity);

  if (input.quoteQuantity !== undefined) {
    const quoteQuantity = validateNonNegativeFinite(
      input.quoteQuantity,
      "Quote quantity",
    );

    if (Math.abs(quoteQuantity - calculatedQuoteQuantity) > 1e-9) {
      throw new Error("Quote quantity does not match price and quantity");
    }
  }

  return Object.freeze({
    id: normalizeRequiredString(input.id, "Fill ID"),
    orderId: normalizeRequiredString(input.orderId, "Order ID"),
    exchange: normalizeRequiredString(input.exchange, "Exchange"),
    symbol: normalizeSymbol(input.symbol),
    side: input.side,
    price,
    quantity,
    quoteQuantity: calculatedQuoteQuantity,
    fee,
    feeAsset: normalizeSymbol(input.feeAsset),
    timestamp: validateTimestamp(input.timestamp),
  });
}

export interface Fill {
  readonly id: string;
  readonly orderId: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly side: FillSide;
  readonly price: number;
  readonly quantity: number;
  readonly quoteQuantity: number;
  readonly fee: number;
  readonly feeAsset: FeeAsset;
  readonly timestamp: number;
}

export function calculateQuoteQuantity(price: number, quantity: number): number {
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw new Error("Invalid fill price or quantity");
  }

  const quoteQuantity = price * quantity;

  if (!Number.isFinite(quoteQuantity)) {
    throw new Error("Fill quote quantity must be finite");
  }

  return quoteQuantity;
}

export function calculateAverageFillPrice(fills: readonly Fill[]): number {
  if (fills.length === 0) return 0;

  let totalQuote = 0;
  let totalQuantity = 0;

  for (const fill of fills) {
    totalQuote += fill.quoteQuantity;
    totalQuantity += fill.quantity;
  }

  return totalQuantity === 0 ? 0 : totalQuote / totalQuantity;
}
