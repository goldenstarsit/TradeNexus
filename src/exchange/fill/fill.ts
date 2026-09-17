export type FillSide = "buy" | "sell";
export type FeeAsset = string;

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
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Invalid fill price or quantity");
  }
  return price * quantity;
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
