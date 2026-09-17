import type { MarketTicker, MarketTrade, OrderBook, OrderBookLevel } from "../marketData";

const ticker: MarketTicker = {
  symbol: "BTCUSDT",
  lastPrice: 100000,
  bidPrice: 99999,
  askPrice: 100001,
  bidQuantity: 0.5,
  askQuantity: 0.4,
  volume: 1234,
  quoteVolume: 123400000,
  timestamp: Date.now(),
};

const level: OrderBookLevel = { price: 99999, quantity: 0.5 };
const orderBook: OrderBook = {
  symbol: "BTCUSDT",
  bids: [level],
  asks: [{ price: 100001, quantity: 0.4 }],
  timestamp: Date.now(),
};

const trade: MarketTrade = {
  symbol: "BTCUSDT",
  price: 100000,
  quantity: 0.01,
  timestamp: Date.now(),
  side: "buy",
};

if (ticker.lastPrice <= 0 || !ticker.symbol) throw new Error("Invalid ticker");
if (orderBook.bids[0]?.price >= orderBook.asks[0]?.price) throw new Error("Invalid order book spread");
if (level.price <= 0 || level.quantity <= 0) throw new Error("Invalid order book level");
if (trade.price <= 0 || trade.quantity <= 0) throw new Error("Invalid trade");

console.log("M29 market data contract verification: OK");
