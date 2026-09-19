import assert from "node:assert/strict";
import { createBinanceMarketDataClient } from "../binanceMarketData";
import type { HttpRequest, HttpResponse } from "../../../http/exchangeHttpClient";

const requests: HttpRequest[] = [];

const client = createBinanceMarketDataClient({
  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    requests.push(request);
    if (request.path === "/api/v3/exchangeInfo") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          symbols: [
            {
              symbol: "BTCUSDT",
              status: "TRADING",
              baseAsset: "BTC",
              quoteAsset: "USDT",
            },
            {
              symbol: "ETHUSDT",
              status: "TRADING",
              baseAsset: "ETH",
              quoteAsset: "USDT",
            },
            {
              symbol: "OLDUSDT",
              status: "BREAK",
              baseAsset: "OLD",
              quoteAsset: "USDT",
            },
          ],
        } as T,
      };
    }

    if (request.path === "/api/v3/ticker/24hr") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          symbol: "BTCUSDT",
          lastPrice: "100000.5",
          bidPrice: "100000.4",
          askPrice: "100000.6",
          bidQty: "0.12",
          askQty: "0.15",
          volume: "123.45",
          quoteVolume: "12345000",
          closeTime: 1700000000000,
        } as T,
      };
    }

    return {
      status: 200,
      headers: new Headers(),
      data: {
        lastUpdateId: 123,
        bids: [["100000.0", "0.10"], ["99999.0", "0.20"]],
        asks: [["100001.0", "0.11"], ["100002.0", "0.21"]],
      } as T,
    };
  },
});

async function run() {
const symbols = await client.getSymbols();
assert.equal(symbols.length, 2);
assert.deepEqual(symbols[0], {
  exchangeSymbol: "BTCUSDT",
  baseAsset: { symbol: "BTC" },
  quoteAsset: { symbol: "USDT" },
  marketType: "spot",
});
assert.equal((await client.getSymbol(" ethusdt "))?.exchangeSymbol, "ETHUSDT");
assert.equal(await client.getSymbol("UNKNOWN"), undefined);

const symbolsAgain = await client.getSymbols();
assert.equal(symbolsAgain, symbols);
assert.equal(
  requests.filter((request) => request.path === "/api/v3/exchangeInfo").length,
  1,
);

const ticker = await client.getTicker("btcusdt");
assert.equal(ticker.symbol, "BTCUSDT");
assert.equal(ticker.lastPrice, 100000.5);
assert.equal(ticker.bidPrice, 100000.4);
assert.equal(ticker.askPrice, 100000.6);

const orderBook = await client.getOrderBook("btcusdt", 20);
assert.equal(orderBook.symbol, "BTCUSDT");
assert.deepEqual(orderBook.bids[0], { price: 100000, quantity: 0.1 });
assert.deepEqual(orderBook.asks[0], { price: 100001, quantity: 0.11 });

const tickerRequest = requests.find(
  (request) => request.path === "/api/v3/ticker/24hr",
);
assert.ok(tickerRequest);
assert.equal(tickerRequest.query?.symbol, "BTCUSDT");

const depthRequest = requests.find(
  (request) => request.path === "/api/v3/depth",
);
assert.ok(depthRequest);
assert.equal(depthRequest.query?.symbol, "BTCUSDT");
assert.equal(depthRequest.query?.limit, 20);

console.log("M37 Binance market data verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
