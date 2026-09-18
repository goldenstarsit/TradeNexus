import assert from "node:assert/strict";
import { createBinanceAccountClient } from "../binanceAccount";
import type {
  HttpRequest,
  HttpResponse,
} from "../../../http/exchangeHttpClient";

const requests: HttpRequest[] = [];

const client = createBinanceAccountClient({
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
        data: {
          balances: [
            { asset: "BTC", free: "0.50000000", locked: "0.10000000" },
            { asset: "USDT", free: "1000.50", locked: "25.25" },
          ],
        } as T,
      };
    },
  },
});

async function run() {
  const snapshot = await client.getBalances();

  assert.equal(snapshot.exchange, "binance");
  assert.equal(snapshot.timestamp, 1700000000000);
  assert.equal(snapshot.balances.length, 2);
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

  assert.equal(requests[0].path, "/api/v3/account");
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].headers?.["X-MBX-APIKEY"], "test-api-key");
  assert.equal(requests[0].query?.recvWindow, 5000);
  assert.equal(requests[0].query?.timestamp, 1700000000000);
  assert.equal(typeof requests[0].query?.signature, "string");
  assert.equal((requests[0].query?.signature as string).length, 64);

  const usdt = await client.getBalances("usdt");

  assert.equal(usdt.balances.length, 1);
  assert.equal(usdt.balances[0].asset, "USDT");

  assert.throws(
    () =>
      createBinanceAccountClient({
        ...({
          apiKey: "",
          apiSecret: "secret",
          httpClient: client as never,
        }),
      }),
    /API key cannot be empty/,
  );

  assert.throws(
    () =>
      createBinanceAccountClient({
        ...({
          apiKey: "key",
          apiSecret: "",
          httpClient: client as never,
        }),
      }),
    /API secret cannot be empty/,
  );

  console.log("M38 Binance account/balance verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
