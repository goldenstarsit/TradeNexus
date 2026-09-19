import assert from "node:assert/strict";
import { createHtxMarketDataClient } from "../htxMarketData";
import type { ExchangeHttpClient, HttpRequest, HttpResponse } from "../../../http/exchangeHttpClient";

class FakeHttpClient implements ExchangeHttpClient {
  requests: HttpRequest[] = [];

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    this.requests.push(request);

    if (request.path === "/v1/common/symbols") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          data: [
            {
              symbol: "btcusdt",
              "base-currency": "btc",
              "quote-currency": "usdt",
              state: "online",
            },
            {
              symbol: "ethusdt",
              "base-currency": "eth",
              "quote-currency": "usdt",
              state: "online",
            },
            {
              symbol: "oldusdt",
              "base-currency": "old",
              "quote-currency": "usdt",
              state: "offline",
            },
          ],
        } as T,
      };
    }

    if (request.path === "/market/detail/merged") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          ts: 1700000000123,
          tick: {
            close: 100000,
            amount: 123.45,
            vol: 12345000,
            bid: [99999, 0.5],
            ask: [100001, 0.25],
          },
        } as T,
      };
    }

    return {
      status: 200,
      headers: new Headers(),
      data: {
        status: "ok",
        ts: 1700000000456,
        tick: {
          bids: [[99999, 0.5], [99998, 0.7]], 
          asks: [[100001, 0.25], [100002, 0.4]], 
        },
      } as T,
    };
  }
}

async function run() {
  const httpClient = new FakeHttpClient();
  const client = createHtxMarketDataClient(httpClient);

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
    httpClient.requests.filter(
      (request) => request.path === "/v1/common/symbols",
    ).length,
    1,
  );

  const ticker = await client.getTicker(" BTCUSDT ");
  assert.deepEqual(ticker, {
    symbol: "BTCUSDT",
    lastPrice: 100000,
    bidPrice: 99999,
    askPrice: 100001,
    bidQuantity: 0.5,
    askQuantity: 0.25,
    volume: 123.45,
    quoteVolume: 12345000,
    timestamp: 1700000000123,
  });

  const tickerRequest = httpClient.requests.find(
    (request) => request.path === "/market/detail/merged",
  );
  assert.deepEqual(tickerRequest, {
    method: "GET",
    path: "/market/detail/merged",
    query: { symbol: "btcusdt" },
  });

  const orderBook = await client.getOrderBook(" BTCUSDT ", 10);
  assert.deepEqual(orderBook, {
    symbol: "BTCUSDT",
    bids: [
      { price: 99999, quantity: 0.5 },
      { price: 99998, quantity: 0.7 },
    ],
    asks: [
      { price: 100001, quantity: 0.25 },
      { price: 100002, quantity: 0.4 },
    ],
    timestamp: 1700000000456,
  });

  const orderBookRequest = httpClient.requests.find(
    (request) => request.path === "/market/depth",
  );
  assert.deepEqual(orderBookRequest, {
    method: "GET",
    path: "/market/depth",
    query: { symbol: "btcusdt", type: "step0", depth: 10 },
  });

  console.log("M51 HTX market data verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
