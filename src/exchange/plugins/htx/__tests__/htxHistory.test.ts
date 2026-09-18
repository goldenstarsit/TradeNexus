import assert from "node:assert/strict";
import test from "node:test";
import { HtxHistoryClient } from "../htxHistory";

const NOW = new Date("2023-11-14T22:13:20Z");

function createClient(
  response: unknown,
  requests: Array<{
    method: string;
    path: string;
    query?: Record<string, string>;
  }>,
) {
  return new HtxHistoryClient({
    credentials: {
      apiKey: "key",
      apiSecret: "secret",
    },
    now: () => NOW,
    httpClient: {
      async request(request: any) {
        requests.push({
          method: request.method,
          path: request.path,
          query: request.query,
        });

        return {
          status: 200,
          headers: {},
          data: response,
        };
      },
    } as any,
  });
}

test("HTX order history maps orders response to common Order model", async () => {
  const requests: Array<{
    method: string;
    path: string;
    query?: Record<string, string>;
  }> = [];

  const client = createClient(
    {
      status: "ok",
      data: [
        {
          id: 12345,
          "client-order-id": "client-1",
          symbol: "btcusdt",
          amount: "0.01000",
          price: "50000",
          "created-at": 1699999999000,
          "finished-at": 1700000000000,
          type: "buy-limit-maker",
          "filled-amount": "0.00400",
          state: "partial-filled",
        },
      ],
    },
    requests,
  );

  const orders = await client.getOrderHistory({
    symbol: "BTCUSDT",
    startTime: 1699990000000,
    endTime: 1700000000000,
    limit: 100,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/v1/order/orders");
  assert.equal(requests[0].query?.symbol, "btcusdt");
  assert.equal(requests[0].query?.["start-time"], "1699990000000");
  assert.equal(requests[0].query?.["end-time"], "1700000000000");
  assert.equal(requests[0].query?.size, "100");
  assert.equal(requests[0].query?.AccessKeyId, "key");
  assert.equal(requests[0].query?.SignatureMethod, "HmacSHA256");
  assert.equal(requests[0].query?.SignatureVersion, "2");
  assert.equal(
    requests[0].query?.Timestamp,
    "2023-11-14T22:13:20",
  );
  assert.ok(requests[0].query?.Signature);

  assert.equal(orders.length, 1);
  assert.equal(orders[0].id, "12345");
  assert.equal(orders[0].clientOrderId, "client-1");
  assert.equal(orders[0].exchange, "htx");
  assert.equal(orders[0].symbol, "BTCUSDT");
  assert.equal(orders[0].side, "buy");
  assert.equal(orders[0].type, "makerOnly");
  assert.equal(orders[0].status, "partiallyFilled");
  assert.equal(orders[0].price, 50000);
  assert.equal(orders[0].quantity, 0.01);
  assert.equal(orders[0].executedQuantity, 0.004);
  assert.equal(orders[0].remainingQuantity, 0.006);
  assert.equal(orders[0].createdAt, 1699999999000);
  assert.equal(orders[0].updatedAt, 1700000000000);
});

test("HTX trade history maps matchresults response to common Fill model", async () => {
  const requests: Array<{
    method: string;
    path: string;
    query?: Record<string, string>;
  }> = [];

  const client = createClient(
    {
      status: "ok",
      data: [
        {
          id: 98765,
          "trade-id": 87654,
          "order-id": 54321,
          symbol: "ethusdt",
          price: "3000",
          "filled-amount": "0.25",
          "filled-fees": "0.75",
          "fee-currency": "USDT",
          type: "buy-limit",
          "created-at": 1700000000000,
        },
      ],
    },
    requests,
  );

  const fills = await client.getTradeHistory({
    symbol: "ETHUSDT",
    startTime: 1699990000000,
    endTime: 1700000000000,
    limit: 50,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/v1/order/matchresults");
  assert.equal(requests[0].query?.symbol, "ethusdt");
  assert.equal(requests[0].query?.["start-time"], "1699990000000");
  assert.equal(requests[0].query?.["end-time"], "1700000000000");
  assert.equal(requests[0].query?.size, "50");
  assert.equal(requests[0].query?.AccessKeyId, "key");
  assert.ok(requests[0].query?.Signature);

  assert.equal(fills.length, 1);
  assert.equal(fills[0].id, "87654");
  assert.equal(fills[0].orderId, "54321");
  assert.equal(fills[0].exchange, "htx");
  assert.equal(fills[0].symbol, "ETHUSDT");
  assert.equal(fills[0].side, "buy");
  assert.equal(fills[0].price, 3000);
  assert.equal(fills[0].quantity, 0.25);
  assert.equal(fills[0].quoteQuantity, 750);
  assert.equal(fills[0].fee, 0.75);
  assert.equal(fills[0].feeAsset, "USDT");
});

test("HTX history requires symbol", async () => {
  const client = new HtxHistoryClient({
    credentials: {
      apiKey: "key",
      apiSecret: "secret",
    },
    httpClient: {
      async request() {
        throw new Error("request should not be called");
      },
    } as any,
  });

  await assert.rejects(
    () => client.getOrderHistory(),
    /HTX order history requires a symbol/,
  );

  await assert.rejects(
    () => client.getTradeHistory(),
    /HTX trade history requires a symbol/,
  );
});

test("HTX history rejects unsupported common filters", async () => {
  const client = new HtxHistoryClient({
    credentials: {
      apiKey: "key",
      apiSecret: "secret",
    },
    httpClient: {
      async request() {
        throw new Error("request should not be called");
      },
    } as any,
  });

  await assert.rejects(
    () =>
      client.getOrderHistory({
        symbol: "BTCUSDT",
        orderId: "123",
      }),
    /does not support orderId filtering/,
  );

  await assert.rejects(
    () =>
      client.getOrderHistory({
        symbol: "BTCUSDT",
        clientOrderId: "client-1",
      }),
    /does not support clientOrderId filtering/,
  );

  await assert.rejects(
    () =>
      client.getOrderHistory({
        symbol: "BTCUSDT",
        statuses: ["filled"],
      }),
    /does not support status filtering/,
  );

  await assert.rejects(
    () =>
      client.getTradeHistory({
        symbol: "BTCUSDT",
        orderId: "123",
      }),
    /does not support orderId filtering/,
  );
});
