import test from "node:test";
import assert from "node:assert/strict";
import type { Fill } from "../../fill/fill";
import type { Order } from "../../order/order";
import type { ExchangePlugin } from "../../plugin/exchangePlugin";
import { ExchangeError } from "../../domain/exchangeError";

import { createOrderExecutionService } from "../orderExecutionService";

function makeOrder(
  overrides: Partial<Order> = {},
): Order {
  const timestamp = Date.now() + 10_000;

  return {
    id: "order-1",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    type: "makerOnly",
    status: "filled",
    price: 100,
    quantity: 1,
    executedQuantity: 1,
    remainingQuantity: 0,
    createdAt: timestamp,
    updatedAt: timestamp + 100,
    ...overrides,
  };
}

function makeFill(
  overrides: Partial<Fill> = {},
): Fill {
  return {
    id: "fill-1",
    orderId: "order-1",
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    price: 100,
    quantity: 1,
    quoteQuantity: 100,
    fee: 0.01,
    feeAsset: "USDT",
    timestamp: Date.now() + 10_050,
    ...overrides,
  };
}

function makePlugin(
  placeOrder: ExchangePlugin["placeOrder"],
  getOrderFills: ExchangePlugin["getOrderFills"],
): ExchangePlugin {
  return {
    metadata: {
      id: "binance",
      name: "Binance",
      status: "enabled",
      baseUrl: "https://api.binance.com",
      marketTypes: ["spot"],
    },
    capabilities: {
      exchangeId: "binance",
      supported: new Set(["spot"]),
      supports: () => true,
    },
    getSymbols: async () => [],
    getSymbol: async () => undefined,
    getTicker: async () => {
      throw new Error("unused");
    },
    getOrderBook: async () => {
      throw new Error("unused");
    },
    getBalance: async () => {
      throw new Error("unused");
    },
    getOpenOrders: async () => [],
    getOrder: async () => {
      throw new Error("unused");
    },
    getOrderFills,
    placeOrder,
    cancelOrder: async () => {
      throw new Error("unused");
    },
    cancelAllOrders: async () => [],
  };
}


test("makerOnly creates a maker result with fills", async () => {
  let receivedType = "";
  const plugin = makePlugin(
    async (request) => {
      receivedType = request.type;
      return makeOrder();
    },
    async () => [makeFill()],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "makerOnly",
  });

  assert.equal(receivedType, "makerOnly");
  assert.equal(result.executionType, "maker");
  assert.equal(result.status, "filled");
  assert.equal(result.executedQuantity, 1);
  assert.equal(result.averagePrice, 100);
  assert.equal(result.takerFallbackUsed, false);
  assert.equal(result.attempts.length, 1);
});

test("filled order preserves exchange-reported quantity when fills are unavailable", async () => {
  const plugin = makePlugin(
    async () =>
      makeOrder({
        executedQuantity: 1,
        remainingQuantity: 0,
        status: "filled",
      }),
    async () => [],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "makerOnly",
  });

  assert.equal(result.status, "filled");
  assert.equal(result.executedQuantity, 1);
  assert.equal(result.remainingQuantity, 0);
  assert.equal(result.reportedExecutedQuantity, 1);
});


test("takerOnly creates a taker result", async () => {
  let receivedType = "";
  const plugin = makePlugin(
    async (request) => {
      receivedType = request.type;
      return makeOrder({
        id: "taker-1",
        type: "market",
        price: undefined,
      });
    },
    async () => [makeFill()],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    executionMode: "takerOnly",
  });

  assert.equal(receivedType, "market");
  assert.equal(result.executionType, "taker");
  assert.equal(result.status, "filled");
  assert.equal(result.takerFallbackUsed, false);
});

test("hybrid falls back to taker only after maker liquidity rejection", async () => {
  const types: string[] = [];
  const plugin = makePlugin(
    async (request) => {
      types.push(request.type);

      if (request.type === "makerOnly") {
        throw new ExchangeError(
          "binance",
          "INVALID_REQUEST",
          "Maker order would take liquidity and immediately match",
          {
            msg: "Order would immediately match and take liquidity",
          },
        );
      }

      return makeOrder({
        id: "taker-1",
        type: "market",
        price: undefined,
      });
    },
    async () => [
      makeFill({
        id: "fill-taker",
        orderId: "taker-1",
      }),
    ],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "hybrid",
  });

  assert.deepEqual(types, ["makerOnly", "market"]);
  assert.equal(result.executionType, "taker");
  assert.equal(result.takerFallbackUsed, true);
  assert.equal(result.status, "filled");
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0]?.status, "failed");
  assert.equal(result.attempts[1]?.status, "success");
});

test("hybrid does not fall back on authentication errors", async () => {
  const types: string[] = [];
  const plugin = makePlugin(
    async (request) => {
      types.push(request.type);

      if (request.type === "makerOnly") {
        throw new Error("authentication failed");
      }

      throw new Error("taker must not execute");
    },
    async () => [],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "hybrid",
  });

  assert.deepEqual(types, ["makerOnly"]);
  assert.equal(result.status, "failed");
  assert.equal(result.takerFallbackUsed, false);
});

test("maker-capable execution requires makerPrice", async () => {
  const plugin = makePlugin(
    async () => makeOrder(),
    async () => [],
  );

  const service = createOrderExecutionService(plugin);

  await assert.rejects(
    service.execute({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 1,
      executionMode: "makerOnly",
    }),
    /makerPrice is required/,
  );
});

test("hybrid uses taker after ExchangeError maker liquidity rejection", async () => {
  const types: string[] = [];
  const plugin = makePlugin(
    async (request) => {
      types.push(request.type);

      if (request.type === "makerOnly") {
        const { ExchangeError } = await import("../../domain/exchangeError");
        throw new ExchangeError(
          "binance",
          "INVALID_REQUEST",
          "Exchange rejected maker order",
          {
            code: -2010,
            msg: "Order would immediately match and take liquidity",
          },
        );
      }

      return makeOrder({
        id: "taker-2",
        type: "market",
        price: undefined,
      });
    },
    async () => [
      makeFill({
        id: "fill-taker-2",
        orderId: "taker-2",
      }),
    ],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "hybrid",
  });

  assert.deepEqual(types, ["makerOnly", "market"]);
  assert.equal(result.executionType, "taker");
  assert.equal(result.takerFallbackUsed, true);
});

test("fill quantity takes precedence over exchange-reported quantity", async () => {
  const plugin = makePlugin(
    async () =>
      makeOrder({
        executedQuantity: 1,
        remainingQuantity: 0,
        status: "filled",
      }),
    async () => [
      makeFill({
        quantity: 0.4,
        quoteQuantity: 40,
      }),
    ],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "makerOnly",
  });

  assert.equal(result.executedQuantity, 0.4);
  assert.equal(result.remainingQuantity, 0.6);
  assert.equal(result.reportedExecutedQuantity, 1);
  assert.equal(result.averagePrice, 100);
});

test("partially filled order preserves exchange-reported quantity when fills are unavailable", async () => {
  const plugin = makePlugin(
    async () =>
      makeOrder({
        executedQuantity: 0.4,
        remainingQuantity: 0.6,
        status: "partiallyFilled",
      }),
    async () => [],
  );

  const service = createOrderExecutionService(plugin);

  const result = await service.execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "makerOnly",
  });

  assert.equal(result.status, "partiallyFilled");
  assert.equal(result.executedQuantity, 0.4);
  assert.equal(result.remainingQuantity, 0.6);
  assert.equal(result.reportedExecutedQuantity, 0.4);
});

test("reported executed quantity cannot exceed requested quantity", async () => {
  const plugin = makePlugin(
    async () =>
      makeOrder({
        executedQuantity: 1.1,
        remainingQuantity: 0,
        status: "filled",
      }),
    async () => [],
  );

  const service = createOrderExecutionService(plugin);

  await assert.rejects(
    service.execute({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 1,
      makerPrice: 100,
      executionMode: "makerOnly",
    }),
    /Executed quantity cannot exceed requested execution quantity/,
  );
});

test("preserves exchange order lifecycle status for open orders", async () => {
  const plugin = makePlugin(
    async () =>
      makeOrder({
        id: "order-open",
        status: "open",
        executedQuantity: 0,
        remainingQuantity: 1,
      }),
    async () => [],
  );

  const result = await createOrderExecutionService(plugin).execute({
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    makerPrice: 100,
    executionMode: "makerOnly",
  });

  assert.equal(result.status, "failed");
  assert.equal(result.orderStatus, "open");
});

test("preserves canceled, rejected, and expired lifecycle statuses", async () => {
  for (const orderStatus of ["canceled", "rejected", "expired"] as const) {
    const plugin = makePlugin(
      async () =>
        makeOrder({
          id: `order-${orderStatus}`,
          status: orderStatus,
          executedQuantity: 0,
          remainingQuantity: 1,
        }),
      async () => [],
    );

    const result = await createOrderExecutionService(plugin).execute({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 1,
      makerPrice: 100,
      executionMode: "makerOnly",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.orderStatus, orderStatus);
  }
});

test("preserves filled and partially filled lifecycle statuses separately from execution outcome", async () => {
  for (const [orderStatus, expectedResultStatus] of [
    ["filled", "filled"],
    ["partiallyFilled", "partiallyFilled"],
  ] as const) {
    const plugin = makePlugin(
      async () =>
        makeOrder({
          id: `order-${orderStatus}`,
          status: orderStatus,
          executedQuantity: orderStatus === "filled" ? 1 : 0.4,
          remainingQuantity: orderStatus === "filled" ? 0 : 0.6,
        }),
      async () => [],
    );

    const result = await createOrderExecutionService(plugin).execute({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 1,
      makerPrice: 100,
      executionMode: "makerOnly",
    });

    assert.equal(result.status, expectedResultStatus);
    assert.equal(result.orderStatus, orderStatus);
  }
});
