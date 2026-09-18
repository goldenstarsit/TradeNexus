import assert from "node:assert/strict";
import test from "node:test";
import { MexcHistoryClient } from "../mexcHistory";

test("MEXC order history maps allOrders response to common Order model", async () => {
  const requests: Array<{ method: string; path: string; query?: Record<string, string> }> = [];

  const client = new MexcHistoryClient({
    apiKey: "key",
    apiSecret: "secret",
    now: () => 1700000000000,
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
          data: [
            {
              symbol: "BTCUSDT",
              orderId: "12345",
              clientOrderId: "client-1",
              price: "50000",
              origQty: "0.01000",
              executedQty: "0.00400",
              status: "PARTIALLY_FILLED",
              type: "LIMIT_MAKER",
              side: "BUY",
              time: 1699999999000,
              updateTime: 1700000000000,
            },
          ],
        };
      },
    } as any,
  });

  const orders = await client.getOrderHistory({
    symbol: "btcusdt",
    startTime: 1699990000000,
    endTime: 1700000000000,
    limit: 100,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/api/v3/allOrders");
  assert.equal(requests[0].query?.symbol, "BTCUSDT");
  assert.equal(requests[0].query?.startTime, "1699990000000");
  assert.equal(requests[0].query?.endTime, "1700000000000");
  assert.equal(requests[0].query?.limit, "100");
  assert.equal(requests[0].query?.timestamp, "1700000000000");

  assert.equal(orders.length, 1);
  assert.equal(orders[0].id, "12345");
  assert.equal(orders[0].clientOrderId, "client-1");
  assert.equal(orders[0].exchange, "mexc");
  assert.equal(orders[0].symbol, "BTCUSDT");
  assert.equal(orders[0].side, "buy");
  assert.equal(orders[0].type, "makerOnly");
  assert.equal(orders[0].status, "partiallyFilled");
  assert.equal(orders[0].quantity, 0.01);
  assert.equal(orders[0].executedQuantity, 0.004);
  assert.equal(orders[0].remainingQuantity, 0.006);
});

test("MEXC trade history maps myTrades response to common Fill model", async () => {
  const requests: Array<{ method: string; path: string; query?: Record<string, string> }> = [];

  const client = new MexcHistoryClient({
    apiKey: "key",
    apiSecret: "secret",
    now: () => 1700000000000,
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
          data: [
            {
              symbol: "ETHUSDT",
              id: "98765",
              orderId: "54321",
              price: "3000",
              qty: "0.25",
              quoteQty: "750",
              commission: "0.75",
              commissionAsset: "USDT",
              time: 1700000000000,
              isBuyer: true,
            },
          ],
        };
      },
    } as any,
  });

  const fills = await client.getTradeHistory({
    symbol: "ethusdt",
    orderId: "54321",
    startTime: 1699990000000,
    endTime: 1700000000000,
    limit: 50,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/api/v3/myTrades");
  assert.equal(requests[0].query?.symbol, "ETHUSDT");
  assert.equal(requests[0].query?.orderId, "54321");
  assert.equal(requests[0].query?.startTime, "1699990000000");
  assert.equal(requests[0].query?.endTime, "1700000000000");
  assert.equal(requests[0].query?.limit, "50");
  assert.equal(requests[0].query?.timestamp, "1700000000000");

  assert.equal(fills.length, 1);
  assert.equal(fills[0].id, "98765");
  assert.equal(fills[0].orderId, "54321");
  assert.equal(fills[0].exchange, "mexc");
  assert.equal(fills[0].symbol, "ETHUSDT");
  assert.equal(fills[0].side, "buy");
  assert.equal(fills[0].price, 3000);
  assert.equal(fills[0].quantity, 0.25);
  assert.equal(fills[0].quoteQuantity, 750);
  assert.equal(fills[0].fee, 0.75);
  assert.equal(fills[0].feeAsset, "USDT");
});

test("MEXC history requires symbol", async () => {
  const client = new MexcHistoryClient({
    apiKey: "key",
    apiSecret: "secret",
    httpClient: {
      async request() {
        throw new Error("request should not be called");
      },
    } as any,
  });

  await assert.rejects(
    () => client.getOrderHistory(),
    /MEXC order history requires a symbol/,
  );

  await assert.rejects(
    () => client.getTradeHistory(),
    /MEXC trade history requires a symbol/,
  );
});

test("MEXC order history rejects unsupported common filters", async () => {
  const client = new MexcHistoryClient({
    apiKey: "key",
    apiSecret: "secret",
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
});
