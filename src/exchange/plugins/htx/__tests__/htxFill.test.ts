import assert from "node:assert/strict";
import { createHtxFillClient } from "../htxFill";
import type {
  ExchangeHttpClient,
  HttpRequest,
  HttpResponse,
} from "../../../http/exchangeHttpClient";

class FakeHttpClient implements ExchangeHttpClient {
  requests: HttpRequest[] = [];

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    this.requests.push(request);

    assert.equal(request.method, "GET");
    assert.equal(
      request.path,
      "/v1/order/orders/900001/matchresults",
    );

    return {
      status: 200,
      headers: new Headers(),
      data: {
        status: "ok",
        data: [
          {
            id: 313288753120940,
            "trade-id": 1085,
            "order-id": 900001,
            symbol: "btcusdt",
            price: "100000",
            "filled-amount": "0.010",
            "filled-fees": "0.00001",
            "fee-currency": "btc",
            type: "buy-limit-maker",
            "created-at": 1629443051839,
          },
          {
            id: 313288753120941,
            "trade-id": 1086,
            "order-id": 900001,
            symbol: "ethusdt",
            price: "3000",
            "filled-amount": "1",
            "filled-fees": "0.003",
            "fee-currency": "eth",
            type: "buy-limit",
            "created-at": 1629443051840,
          },
        ],
      } as T,
    };
  }
}

async function run() {
  const httpClient = new FakeHttpClient();

  const client = createHtxFillClient({
    httpClient,
    credentials: {
      apiKey: "test-api-key",
      apiSecret: "test-api-secret",
    },
    now: () => new Date("2021-08-20T10:00:00.000Z"),
  });

  const fills = await client.getOrderFills("900001", "BTCUSDT");

  assert.equal(fills.length, 1);

  assert.deepEqual(fills[0], {
    id: "1085",
    orderId: "900001",
    exchange: "htx",
    symbol: "BTCUSDT",
    side: "buy",
    price: 100000,
    quantity: 0.01,
    quoteQuantity: 1000,
    fee: 0.00001,
    feeAsset: "btc",
    timestamp: 1629443051839,
  });

  assert.equal(httpClient.requests.length, 1);

  const request = httpClient.requests[0];

  assert.equal(request.query?.AccessKeyId, "test-api-key");
  assert.equal(request.query?.SignatureMethod, "HmacSHA256");
  assert.equal(request.query?.SignatureVersion, "2");
  assert.equal(typeof request.query?.Timestamp, "string");
  assert.equal(typeof request.query?.Signature, "string");

  console.log("M54 HTX fill & fee mapping verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
