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
