export interface MarketTicker {
  readonly symbol: string;
  readonly lastPrice: number;
  readonly bidPrice?: number;
  readonly askPrice?: number;
  readonly bidQuantity?: number;
  readonly askQuantity?: number;
  readonly volume?: number;
  readonly quoteVolume?: number;
  readonly timestamp: number;
}

export interface OrderBookLevel {
  readonly price: number;
  readonly quantity: number;
}

export interface OrderBook {
  readonly symbol: string;
  readonly bids: readonly OrderBookLevel[];
  readonly asks: readonly OrderBookLevel[];
  readonly timestamp: number;
}

export interface MarketTrade {
  readonly symbol: string;
  readonly price: number;
  readonly quantity: number;
  readonly timestamp: number;
  readonly side?: "buy" | "sell";
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

export function createMarketTicker(input: {
  readonly symbol: string;
  readonly lastPrice: number;
  readonly bidPrice?: number;
  readonly askPrice?: number;
  readonly bidQuantity?: number;
  readonly askQuantity?: number;
  readonly volume?: number;
  readonly quoteVolume?: number;
  readonly timestamp: number;
}): MarketTicker {
  const lastPrice = validatePositiveFinite(input.lastPrice, "Last price");

  const bidPrice =
    input.bidPrice === undefined
      ? undefined
      : validatePositiveFinite(input.bidPrice, "Bid price");

  const askPrice =
    input.askPrice === undefined
      ? undefined
      : validatePositiveFinite(input.askPrice, "Ask price");

  if (
    bidPrice !== undefined &&
    askPrice !== undefined &&
    bidPrice > askPrice
  ) {
    throw new Error("Bid price cannot exceed ask price");
  }

  const bidQuantity =
    input.bidQuantity === undefined
      ? undefined
      : validateNonNegativeFinite(input.bidQuantity, "Bid quantity");

  const askQuantity =
    input.askQuantity === undefined
      ? undefined
      : validateNonNegativeFinite(input.askQuantity, "Ask quantity");

  const volume =
    input.volume === undefined
      ? undefined
      : validateNonNegativeFinite(input.volume, "Volume");

  const quoteVolume =
    input.quoteVolume === undefined
      ? undefined
      : validateNonNegativeFinite(input.quoteVolume, "Quote volume");

  return Object.freeze({
    symbol: normalizeSymbol(input.symbol),
    lastPrice,
    ...(bidPrice === undefined ? {} : { bidPrice }),
    ...(askPrice === undefined ? {} : { askPrice }),
    ...(bidQuantity === undefined ? {} : { bidQuantity }),
    ...(askQuantity === undefined ? {} : { askQuantity }),
    ...(volume === undefined ? {} : { volume }),
    ...(quoteVolume === undefined ? {} : { quoteVolume }),
    timestamp: validateTimestamp(input.timestamp),
  });
}

export function createOrderBookLevel(input: {
  readonly price: number;
  readonly quantity: number;
}): OrderBookLevel {
  return Object.freeze({
    price: validatePositiveFinite(input.price, "Order book price"),
    quantity: validatePositiveFinite(input.quantity, "Order book quantity"),
  });
}

export function createOrderBook(input: {
  readonly symbol: string;
  readonly bids: readonly OrderBookLevel[];
  readonly asks: readonly OrderBookLevel[];
  readonly timestamp: number;
}): OrderBook {
  const bids = input.bids.map((level) =>
    createOrderBookLevel(level),
  );
  const asks = input.asks.map((level) =>
    createOrderBookLevel(level),
  );

  for (let index = 1; index < bids.length; index += 1) {
    if (bids[index - 1].price < bids[index].price) {
      throw new Error("Bids must be sorted in descending price order");
    }
  }

  for (let index = 1; index < asks.length; index += 1) {
    if (asks[index - 1].price > asks[index].price) {
      throw new Error("Asks must be sorted in ascending price order");
    }
  }

  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;

  if (
    bestBid !== undefined &&
    bestAsk !== undefined &&
    bestBid >= bestAsk
  ) {
    throw new Error("Order book bid must be below ask");
  }

  return Object.freeze({
    symbol: normalizeSymbol(input.symbol),
    bids: Object.freeze(bids),
    asks: Object.freeze(asks),
    timestamp: validateTimestamp(input.timestamp),
  });
}

export function isMarketTradeSide(
  value: string,
): value is NonNullable<MarketTrade["side"]> {
  return value === "buy" || value === "sell";
}

export function createMarketTrade(input: {
  readonly symbol: string;
  readonly price: number;
  readonly quantity: number;
  readonly timestamp: number;
  readonly side?: "buy" | "sell";
}): MarketTrade {
  if (input.side !== undefined && !isMarketTradeSide(input.side)) {
    throw new Error(`Unsupported trade side: ${String(input.side)}`);
  }

  return Object.freeze({
    symbol: normalizeSymbol(input.symbol),
    price: validatePositiveFinite(input.price, "Trade price"),
    quantity: validatePositiveFinite(input.quantity, "Trade quantity"),
    timestamp: validateTimestamp(input.timestamp),
    ...(input.side === undefined ? {} : { side: input.side }),
  });
}
