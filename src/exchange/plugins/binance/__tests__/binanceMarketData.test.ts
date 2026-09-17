import assert from "node:assert/strict";
import { createBinanceMarketDataClient } from "../binanceMarketData";
import type { HttpRequest, HttpResponse } from "../../../http/exchangeHttpClient";

const requests: HttpRequest[] = [];

const client = createBinanceMarketDataClient({
  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    requests.push(request);
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
const ticker = await client.getTicker("btcusdt");
assert.equal(ticker.symbol, "BTCUSDT");
assert.equal(ticker.lastPrice, 100000.5);
assert.equal(ticker.bidPrice, 100000.4);
assert.equal(ticker.askPrice, 100000.6);

const orderBook = await client.getOrderBook("btcusdt", 20);
assert.equal(orderBook.symbol, "BTCUSDT");
assert.deepEqual(orderBook.bids[0], { price: 100000, quantity: 0.1 });
assert.deepEqual(orderBook.asks[0], { price: 100001, quantity: 0.11 });

assert.equal(requests[0].path, "/api/v3/ticker/24hr");
assert.equal(requests[0].query?.symbol, "BTCUSDT");
assert.equal(requests[1].path, "/api/v3/depth");
assert.equal(requests[1].query?.symbol, "BTCUSDT");
assert.equal(requests[1].query?.limit, 20);

console.log("M37 Binance market data verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
