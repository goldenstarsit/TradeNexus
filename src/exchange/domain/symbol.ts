export interface Asset {
  symbol: string;
}

export interface TradingSymbol {
  exchangeSymbol: string;
  baseAsset: Asset;
  quoteAsset: Asset;
  marketType: "spot" | "futures";
}
