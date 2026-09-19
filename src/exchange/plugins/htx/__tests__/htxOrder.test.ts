import assert from "node:assert/strict";
import { createHtxOrderClient } from "../htxOrder";
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
            { id: 12345, type: "spot", state: "working" },
          ],
        } as T,
      };
    }

    if (request.path === "/v1/order/orders/place") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          data: "900001",
        } as T,
      };
    }

    if (request.path === "/v1/order/orders/900001") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          data: {
            id: 900001,
            "client-order-id": "client-1",
            symbol: "btcusdt",
            "account-id": 12345,
            amount: "0.01",
            price: "100000",
            "created-at": 1700000000000,
            type: "buy-limit-maker",
            "filled-amount": "0",
            state: "submitted",
          },
        } as T,
      };
    }

    if (request.path === "/v1/order/openOrders") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          data: [
            {
              id: 900001,
              "client-order-id": "client-1",
              symbol: "btcusdt",
              amount: "0.01",
              price: "100000",
              "created-at": 1700000000000,
              type: "buy-limit-maker",
              "filled-amount": "0",
              state: "submitted",
            },
          ],
        } as T,
      };
    }

    if (request.path === "/v1/order/orders/900001/submitcancel") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          data: "900001",
        } as T,
      };
    }

    if (request.path === "/v1/order/orders/batchCancelOpenOrders") {
      return {
        status: 200,
        headers: new Headers(),
        data: {
          status: "ok",
          data: null,
        } as T,
      };
    }

    throw new Error(`Unexpected request: ${request.method} ${request.path}`);
  }
}

async function run() {
  const httpClient = new FakeHttpClient();

  const client = createHtxOrderClient(
    httpClient,
    {
      apiKey: "test-api-key",
      apiSecret: "test-api-secret",
    },
  );

  const placed = await client.placeOrder({
    symbol: " BTCUSDT ",
    side: "buy",
    type: "makerOnly",
    quantity: 0.01,
    price: 100000,
    clientOrderId: "client-1",
  });

  assert.deepEqual(placed, {
    id: "900001",
    clientOrderId: "client-1",
    exchange: "htx",
    symbol: "BTCUSDT",
    side: "buy",
    type: "makerOnly",
    status: "open",
    price: 100000,
    quantity: 0.01,
    executedQuantity: 0,
    remainingQuantity: 0.01,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  });

  const placeRequest = httpClient.requests.find(
    (request) => request.path === "/v1/order/orders/place",
  );

  assert.ok(placeRequest);
  assert.equal(placeRequest.method, "POST");
  assert.deepEqual(placeRequest.body, {
    "account-id": "12345",
    amount: "0.01",
    source: "spot-api",
    symbol: "btcusdt",
    type: "buy-limit-maker",
    price: "100000",
    "client-order-id": "client-1",
  });
  assert.equal(typeof placeRequest.query?.Signature, "string");

  const openOrders = await client.getOpenOrders("BTCUSDT");

  assert.equal(openOrders.length, 1);
  assert.equal(openOrders[0]?.type, "makerOnly");
  assert.equal(openOrders[0]?.status, "open");

  const cancelRequestBefore = httpClient.requests.length;
  const canceled = await client.cancelOrder("900001", "BTCUSDT");

  assert.equal(canceled.id, "900001");
  assert.ok(httpClient.requests.length > cancelRequestBefore);

  await client.cancelAllOrders("BTCUSDT");

  const cancelAllRequest = httpClient.requests.find(
    (request) => request.path === "/v1/order/orders/batchCancelOpenOrders",
  );

  assert.ok(cancelAllRequest);
  assert.equal(cancelAllRequest.method, "POST");
  assert.equal(
    cancelAllRequest.path,
    "/v1/order/orders/batchCancelOpenOrders",
  );

  const cancelAllBody = cancelAllRequest.body as
    | Record<string, string>
    | undefined;

  assert.equal(cancelAllBody?.["account-id"], "12345");
  assert.equal(cancelAllBody?.symbol, "btcusdt");

  await assert.rejects(
    () =>
      client.placeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        type: "stopLimit",
        quantity: 0.01,
        price: 100000,
      }),
    /HTX order type is not supported/,
  );

  await assert.rejects(
    () =>
      client.placeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        type: "stopMarket",
        quantity: 0.01,
      }),
    /HTX order type is not supported/,
  );

  console.log("M53 HTX order management verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
