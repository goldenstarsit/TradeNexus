import assert from "node:assert/strict";
import { createHtxAccountClient } from "../htxAccount";
import type {
  ExchangeHttpClient,
  HttpRequest,
  HttpResponse,
} from "../../../http/exchangeHttpClient";

class FakeHttpClient implements ExchangeHttpClient {
  requests: HttpRequest[] = [];

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    this.requests.push(request);

    if (request.path === "/v1/account/accounts") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          data: [
            { id: 1, type: "spot", state: "working" },
            { id: 2, type: "margin", state: "working" },
          ],
        } as T,
      };
    }

    return {
      status: 200,
      headers: new Headers(),
      data: {
        status: "ok",
        data: {
          id: 1,
          type: "spot",
          state: "working",
          list: [
            { currency: "BTC", type: "trade", balance: "1.25" },
            { currency: "BTC", type: "frozen", balance: "0.25" },
            { currency: "USDT", type: "trade", balance: "1000.5" },
            { currency: "USDT", type: "frozen", balance: "25.5" },
            { currency: "ETH", type: "trade", balance: "3" },
          ],
        },
      } as T,
    };
  }
}

async function run() {
  const httpClient = new FakeHttpClient();

  const client = createHtxAccountClient(
    httpClient,
    {
      apiKey: "test-api-key",
      apiSecret: "test-api-secret",
    },
    "api.huobi.pro",
  );

  const snapshot = await client.getBalance();

  assert.equal(snapshot.exchange, "htx");
  assert.deepEqual(snapshot.balances, [
    { asset: "btc", free: 1.25, locked: 0.25 },
    { asset: "usdt", free: 1000.5, locked: 25.5 },
    { asset: "eth", free: 3, locked: 0 },
  ]);
  assert.equal(typeof snapshot.timestamp, "number");

  assert.equal(httpClient.requests.length, 2);
  assert.equal(httpClient.requests[0].method, "GET");
  assert.equal(httpClient.requests[0].path, "/v1/account/accounts");
  assert.equal(httpClient.requests[0].query?.AccessKeyId, "test-api-key");
  assert.equal(httpClient.requests[0].query?.SignatureMethod, "HmacSHA256");
  assert.equal(httpClient.requests[0].query?.SignatureVersion, "2");
  assert.equal(typeof httpClient.requests[0].query?.Timestamp, "string");
  assert.equal(typeof httpClient.requests[0].query?.Signature, "string");

  assert.deepEqual(httpClient.requests[1].query, {
    AccessKeyId: "test-api-key",
    SignatureMethod: "HmacSHA256",
    SignatureVersion: "2",
    Timestamp: httpClient.requests[1].query?.Timestamp,
    Signature: httpClient.requests[1].query?.Signature,
  });

  const usdt = await client.getBalance(" USDT ");

  assert.deepEqual(usdt.balances, [
    { asset: "usdt", free: 1000.5, locked: 25.5 },
  ]);

  console.log("M52 HTX account & balance verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
