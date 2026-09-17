import assert from "node:assert/strict";
import { createBinanceFillClient } from "../binanceFill";
import type {
  HttpRequest,
  HttpResponse,
} from "../../../http/exchangeHttpClient";

const requests: HttpRequest[] = [];

const client = createBinanceFillClient({
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
  recvWindow: 5000,
  now: () => 1700000000000,
  httpClient: {
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
      requests.push(request);

      return {
        status: 200,
        headers: new Headers(),
        data: [
          {
            id: 98765,
            orderId: 123456,
            symbol: "BTCUSDT",
            price: "100000.00",
            qty: "0.001",
            quoteQty: "100.00",
            commission: "0.000001",
            commissionAsset: "BTC",
            time: 1700000001234,
            isBuyer: true,
          },
          {
            id: 98766,
            orderId: 123456,
            symbol: "BTCUSDT",
            price: "100010.00",
            qty: "0.0005",
            quoteQty: "50.005",
            commission: "0.05",
            commissionAsset: "USDT",
            time: 1700000002234,
            isBuyer: false,
          },
        ] as T,
      };
    },
  },
});

async function run() {
  const fills = await client.getOrderFills("123456", "btcusdt");

  assert.equal(fills.length, 2);

  assert.deepEqual(fills[0], {
    id: "98765",
    orderId: "123456",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    price: 100000,
    quantity: 0.001,
    quoteQuantity: 100,
    fee: 0.000001,
    feeAsset: "BTC",
    timestamp: 1700000001234,
  });

  assert.deepEqual(fills[1], {
    id: "98766",
    orderId: "123456",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "sell",
    price: 100010,
    quantity: 0.0005,
    quoteQuantity: 50.005,
    fee: 0.05,
    feeAsset: "USDT",
    timestamp: 1700000002234,
  });

  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/api/v3/myTrades");
  assert.equal(requests[0].query?.symbol, "BTCUSDT");
  assert.equal(requests[0].query?.orderId, "123456");
  assert.equal(requests[0].query?.recvWindow, 5000);
  assert.equal(requests[0].query?.timestamp, 1700000000000);
  assert.equal(typeof requests[0].query?.signature, "string");
  assert.equal((requests[0].query?.signature as string).length, 64);
  assert.equal(requests[0].headers?.["X-MBX-APIKEY"], "test-api-key");

  console.log("M40 Binance fill/fee mapping verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
