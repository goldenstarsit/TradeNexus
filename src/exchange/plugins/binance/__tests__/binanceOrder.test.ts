import assert from "node:assert/strict";
import { createBinanceOrderClient } from "../binanceOrder";
import type {
  HttpRequest,
  HttpResponse,
} from "../../../http/exchangeHttpClient";

const requests: HttpRequest[] = [];

const orderResponse = {
  symbol: "BTCUSDT",
  orderId: 123456,
  clientOrderId: "client-1",
  price: "100000.00",
  origQty: "0.001",
  executedQty: "0.0005",
  status: "PARTIALLY_FILLED",
  type: "LIMIT_MAKER",
  side: "BUY",
  time: 1700000000000,
  updateTime: 1700000005000,
};

const client = createBinanceOrderClient({
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
  recvWindow: 5000,
  now: () => 1700000000000,
  httpClient: {
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
      requests.push(request);

      if (request.path === "/api/v3/openOrders") {
        return {
          status: 200,
          headers: new Headers(),
          data: [orderResponse] as T,
        };
      }

      return {
        status: 200,
        headers: new Headers(),
        data: orderResponse as T,
      };
    },
  },
});

async function run() {
  const placed = await client.placeOrder({
    symbol: "btcusdt",
    side: "buy",
    type: "makerOnly",
    quantity: 0.001,
    price: 100000,
    clientOrderId: "client-1",
  });

  assert.equal(placed.id, "123456");
  assert.equal(placed.exchange, "binance");
  assert.equal(placed.symbol, "BTCUSDT");
  assert.equal(placed.side, "buy");
  assert.equal(placed.type, "makerOnly");
  assert.equal(placed.status, "partiallyFilled");
  assert.equal(placed.quantity, 0.001);
  assert.equal(placed.executedQuantity, 0.0005);
  assert.equal(placed.remainingQuantity, 0.0005);

  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].path, "/api/v3/order");
  assert.equal(requests[0].query?.symbol, "BTCUSDT");
  assert.equal(requests[0].query?.side, "BUY");
  assert.equal(requests[0].query?.type, "LIMIT_MAKER");
  assert.equal(requests[0].query?.quantity, 0.001);
  assert.equal(requests[0].query?.price, 100000);
  assert.equal(requests[0].query?.timeInForce, "GTC");
  assert.equal(requests[0].query?.newClientOrderId, "client-1");
  assert.equal(typeof requests[0].query?.signature, "string");
  assert.equal((requests[0].query?.signature as string).length, 64);

  const fetched = await client.getOrder("123456", "btcusdt");
  assert.equal(fetched.id, "123456");

  const openOrders = await client.getOpenOrders("btcusdt");
  assert.equal(openOrders.length, 1);
  assert.equal(openOrders[0].id, "123456");

  const canceled = await client.cancelOrder("123456", "btcusdt");
  assert.equal(canceled.status, "partiallyFilled");

  const canceledAll = await client.cancelAllOrders("btcusdt");
  assert.equal(canceledAll.length, 1);

  assert.equal(requests[1].path, "/api/v3/order");
  assert.equal(requests[2].path, "/api/v3/openOrders");
  assert.equal(requests[3].path, "/api/v3/order");
  assert.equal(requests[4].path, "/api/v3/openOrders");

  assert.rejects(
    () => client.cancelAllOrders(),
    /requires a symbol/,
  );

  assert.rejects(
    () =>
      client.placeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        type: "stopMarket",
        quantity: 0.001,
      }),
    /Unsupported Binance order type/,
  );

  assert.rejects(
    () =>
      client.placeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        type: "stopLimit",
        quantity: 0.001,
        price: 100000,
      }),
    /Unsupported Binance order type/,
  );

  console.log("M39 Binance order management verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
