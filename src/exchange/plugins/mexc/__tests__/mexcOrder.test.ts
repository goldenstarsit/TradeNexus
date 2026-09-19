import assert from "node:assert/strict";
import { createMexcOrderClient } from "../mexcOrder";
import type {
  HttpRequest,
  HttpResponse,
} from "../../../http/exchangeHttpClient";

const requests: HttpRequest[] = [];

const httpClient = {
  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    requests.push(request);

    if (request.path === "/api/v3/order" && request.method === "POST") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          symbol: "BTCUSDT",
          orderId: "1001",
          clientOrderId: "client-1",
          price: "100000",
          origQty: "0.001",
          executedQty: "0",
          status: "NEW",
          type: "LIMIT_MAKER",
          side: "BUY",
          transactTime: 1700000000000,
        } as T,
      };
    }

    if (request.path === "/api/v3/order" && request.method === "GET") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          symbol: "BTCUSDT",
          orderId: "1001",
          clientOrderId: "client-1",
          price: "100000",
          origQty: "0.001",
          executedQty: "0.0004",
          status: "PARTIALLY_FILLED",
          type: "LIMIT_MAKER",
          side: "BUY",
          time: 1700000000000,
          updateTime: 1700000005000,
        } as T,
      };
    }

    if (request.path === "/api/v3/openOrders" && request.method === "GET") {
      return {
        status: 200,
        headers: new Headers(),
        data: [
          {
            symbol: "BTCUSDT",
            orderId: "1001",
            clientOrderId: "client-1",
            price: "100000",
            origQty: "0.001",
            executedQty: "0.0004",
            status: "PARTIALLY_FILLED",
            type: "LIMIT_MAKER",
            side: "BUY",
            time: 1700000000000,
            updateTime: 1700000005000,
          },
        ] as T,
      };
    }

    if (request.path === "/api/v3/order" && request.method === "DELETE") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          symbol: "BTCUSDT",
          orderId: "1001",
          clientOrderId: "client-1",
          price: "100000",
          origQty: "0.001",
          executedQty: "0.0004",
          status: "CANCELED",
          type: "LIMIT_MAKER",
          side: "BUY",
          time: 1700000000000,
          updateTime: 1700000006000,
        } as T,
      };
    }

    if (request.path === "/api/v3/openOrders" && request.method === "DELETE") {
      return {
        status: 200,
        headers: new Headers(),
        data: [
          {
            symbol: "BTCUSDT",
            orderId: "1001",
            clientOrderId: "client-1",
            price: "100000",
            origQty: "0.001",
            executedQty: "0.0004",
            status: "CANCELED",
            type: "LIMIT_MAKER",
            side: "BUY",
            time: 1700000000000,
            updateTime: 1700000006000,
          },
        ] as T,
      };
    }

    throw new Error(`Unexpected request: ${request.method} ${request.path}`);
  },
};

const client = createMexcOrderClient({
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
  recvWindow: 5000,
  now: () => 1700000000000,
  httpClient,
});

async function run(): Promise<void> {
  const placed = await client.placeOrder({
    symbol: " btcusdt ",
    side: "buy",
    type: "makerOnly",
    quantity: 0.001,
    price: 100000,
    clientOrderId: "client-1",
  });

  assert.equal(placed.id, "1001");
  assert.equal(placed.exchange, "mexc");
  assert.equal(placed.symbol, "BTCUSDT");
  assert.equal(placed.side, "buy");
  assert.equal(placed.type, "makerOnly");
  assert.equal(placed.status, "new");
  assert.equal(placed.quantity, 0.001);
  assert.equal(placed.executedQuantity, 0);
  assert.ok(Math.abs(placed.remainingQuantity - 0.001) < 1e-12);

  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].path, "/api/v3/order");
  assert.equal(requests[0].headers?.["X-MEXC-APIKEY"], "test-api-key");
  assert.equal(requests[0].query?.symbol, "BTCUSDT");
  assert.equal(requests[0].query?.side, "BUY");
  assert.equal(requests[0].query?.type, "LIMIT_MAKER");
  assert.equal(requests[0].query?.quantity, 0.001);
  assert.equal(requests[0].query?.price, 100000);
  assert.equal(requests[0].query?.newClientOrderId, "client-1");
  assert.equal(typeof requests[0].query?.signature, "string");

  const queried = await client.getOrder("1001", "btcusdt");

  assert.equal(queried.status, "partiallyFilled");
  assert.equal(queried.executedQuantity, 0.0004);
  assert.ok(Math.abs(queried.remainingQuantity - 0.0006) < 1e-12);
  assert.equal(queried.updatedAt, 1700000005000);

  const openOrders = await client.getOpenOrders("btcusdt");

  assert.equal(openOrders.length, 1);
  assert.equal(openOrders[0].id, "1001");
  assert.equal(openOrders[0].status, "partiallyFilled");

  const canceled = await client.cancelOrder("1001", "btcusdt");

  assert.equal(canceled.status, "canceled");
  assert.ok(Math.abs(canceled.remainingQuantity - 0.0006) < 1e-12);

  const canceledAll = await client.cancelAllOrders("btcusdt");

  assert.equal(canceledAll.length, 1);
  assert.equal(canceledAll[0].status, "canceled");

  await assert.rejects(
    () =>
      client.placeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        type: "stopLimit",
        quantity: 0.001,
        price: 100000,
      }),
    /not supported/,
  );

  await assert.rejects(
    () =>
      client.placeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        type: "stopMarket",
        quantity: 0.001,
      }),
    /not supported/,
  );

  console.log("M46 MEXC order management verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
