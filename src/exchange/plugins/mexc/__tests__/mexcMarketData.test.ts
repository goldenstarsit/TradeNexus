import assert from "node:assert/strict";
import { createMexcMarketDataClient } from "../mexcMarketData";
import type { ExchangeHttpClient, HttpRequest } from "../../../http/exchangeHttpClient";

async function run(): Promise<void> {
  const requests: Array<{
    path: string;
    query?: Readonly<Record<string, string | number | boolean>>;
  }> = [];

  const httpClient: ExchangeHttpClient = {
    async request<T>(options: HttpRequest) {
      requests.push({
        path: options.path,
        query: options.query,
      });

      if (options.path === "/api/v3/exchangeInfo") {
        return {
          status: 200,
          data: {
            symbols: [
              {
                symbol: "BTCUSDT",
                status: "ENABLED",
                baseAsset: "BTC",
                quoteAsset: "USDT",
              },
              {
                symbol: "ETHUSDT",
                status: "ENABLED",
                baseAsset: "ETH",
                quoteAsset: "USDT",
              },
              {
                symbol: "OLDUSDT",
                status: "DISABLED",
                baseAsset: "OLD",
                quoteAsset: "USDT",
              },
            ],
          },
        } as never;
      }

      if (options.path === "/api/v3/ticker/24hr") {
        return {
          status: 200,
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
          },
        } as never;
      }

      if (options.path === "/api/v3/depth") {
        return {
          status: 200,
          data: {
            bids: [
              ["100000", "0.1"],
              ["99999", "0.2"],
            ],
            asks: [
              ["100001", "0.11"],
              ["100002", "0.21"],
            ],
          },
        } as never;
      }

      throw new Error(`Unexpected path: ${options.path}`);
    },
  };

  const client = createMexcMarketDataClient(httpClient);

  const ticker = await client.getTicker(" btcusdt ");

  assert.equal(ticker.symbol, "BTCUSDT");
  assert.equal(ticker.lastPrice, 100000.5);
  assert.equal(ticker.bidPrice, 100000.4);
  assert.equal(ticker.askPrice, 100000.6);
  assert.equal(ticker.bidQuantity, 0.12);
  assert.equal(ticker.askQuantity, 0.15);
  assert.equal(ticker.volume, 123.45);
  assert.equal(ticker.quoteVolume, 12345000);
  assert.equal(ticker.timestamp, 1700000000000);

  const orderBook = await client.getOrderBook(" btcusdt ", 50);

  assert.equal(orderBook.symbol, "BTCUSDT");
  assert.deepEqual(orderBook.bids[0], {
    price: 100000,
    quantity: 0.1,
  });
  assert.deepEqual(orderBook.asks[0], {
    price: 100001,
    quantity: 0.11,
  });

  assert.deepEqual(requests, [
    {
      path: "/api/v3/ticker/24hr",
      query: { symbol: "BTCUSDT" },
    },
    {
      path: "/api/v3/depth",
      query: { symbol: "BTCUSDT", limit: 50 },
    },
  ]);

  console.log("M44 MEXC market data verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
