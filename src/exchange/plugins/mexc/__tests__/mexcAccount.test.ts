import assert from "node:assert/strict";
import { createMexcAccountClient } from "../mexcAccount";
import type {
  HttpRequest,
  HttpResponse,
} from "../../../http/exchangeHttpClient";

const requests: HttpRequest[] = [];

const client = createMexcAccountClient({
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
  recvWindow: 5000,
  now: () => 1700000000000,
  httpClient: {
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
      requests.push(request);

      if (request.path === "/api/v3/time") {
        return {
          status: 200,
          headers: new Headers(),
          data: {
            serverTime: 1700000000000,
          } as T,
        };
      }

      if (request.path === "/api/v3/account") {
        return {
          status: 200,
          headers: new Headers(),
          data: {
            balances: [
              { asset: "BTC", free: "0.50000000", locked: "0.10000000" },
              { asset: "USDT", free: "1000.50", locked: "25.25" },
            ],
          } as T,
        };
      }

      throw new Error(`Unexpected MEXC test request: ${request.path}`);
    },
  },
});

async function run(): Promise<void> {
  const snapshot = await client.getBalances();

  assert.equal(snapshot.exchange, "mexc");
  assert.equal(snapshot.timestamp, 1700000000000);
  assert.equal(snapshot.balances.length, 2);

  const accountRequest = requests.find(
    (request) => request.path === "/api/v3/account",
  );
  assert.ok(accountRequest);

  assert.deepEqual(snapshot.balances[0], {
    asset: "BTC",
    free: 0.5,
    locked: 0.1,
  });

  assert.deepEqual(snapshot.balances[1], {
    asset: "USDT",
    free: 1000.5,
    locked: 25.25,
  });

  assert.equal(accountRequest.path, "/api/v3/account");
  assert.equal(accountRequest.method, "GET");
  assert.equal(accountRequest.headers?.["X-MEXC-APIKEY"], "test-api-key");
  assert.equal(accountRequest.query?.recvWindow, 5000);
  assert.equal(accountRequest.query?.timestamp, 1700000000000);
  assert.equal(typeof accountRequest.query?.signature, "string");
  assert.equal((accountRequest.query?.signature as string).length, 64);

  const usdt = await client.getBalances("usdt");

  assert.equal(usdt.exchange, "mexc");
  assert.equal(usdt.balances.length, 1);
  assert.equal(usdt.balances[0].asset, "USDT");

  assert.throws(
    () =>
      createMexcAccountClient({
        ...({
          apiKey: "",
          apiSecret: "secret",
          httpClient: client as never,
        }),
      }),
    /MEXC API key must not be empty/,
  );

  assert.throws(
    () =>
      createMexcAccountClient({
        ...({
          apiKey: "key",
          apiSecret: "",
          httpClient: client as never,
        }),
      }),
    /MEXC API secret must not be empty/,
  );

  console.log("M45 MEXC account/balance verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
