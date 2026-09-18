import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeCancelReplaceRequest,
  type ExchangeCancelReplaceClient,
} from "../exchangeCancelReplace";
import type { Order } from "../../order/order";

const replacement = {
  symbol: "BTCUSDT",
  side: "buy" as const,
  type: "limit" as const,
  quantity: 0.002,
  price: 99000,
};

test("creates normalized cancel-replace request", () => {
  const request = createExchangeCancelReplaceRequest({
    orderId: " order-1 ",
    symbol: "btcusdt",
    replacement,
  });

  assert.equal(request.orderId, "order-1");
  assert.equal(request.symbol, "BTCUSDT");
  assert.equal(request.replacement.symbol, "BTCUSDT");
  assert.notEqual(request.replacement, replacement);

  assert.throws(
    () => {
      (request as { orderId: string }).orderId = "changed";
    },
    TypeError,
  );
});

test("rejects empty order ID", () => {
  assert.throws(
    () =>
      createExchangeCancelReplaceRequest({
        orderId: " ",
        symbol: "BTCUSDT",
        replacement,
      }),
    /Order ID cannot be empty/,
  );
});

test("rejects empty symbol", () => {
  assert.throws(
    () =>
      createExchangeCancelReplaceRequest({
        orderId: "order-1",
        symbol: " ",
        replacement,
      }),
    /Symbol cannot be empty/,
  );
});

test("rejects replacement symbol mismatch", () => {
  assert.throws(
    () =>
      createExchangeCancelReplaceRequest({
        orderId: "order-1",
        symbol: "BTCUSDT",
        replacement: {
          ...replacement,
          symbol: "ETHUSDT",
        },
      }),
    /Replacement order symbol must match cancel-replace symbol/,
  );
});

test("cancel-replace client contract is structurally implementable", async () => {
  const order: Order = {
    id: "order-2",
    exchange: "test",
    symbol: "BTCUSDT",
    side: "buy",
    type: "limit",
    status: "new",
    quantity: 0.002,
    executedQuantity: 0,
    remainingQuantity: 0.002,
    createdAt: 1,
    updatedAt: 1,
  };

  const client: ExchangeCancelReplaceClient = {
    cancelReplaceOrder: async () => order,
  };

  const result = await client.cancelReplaceOrder(
    createExchangeCancelReplaceRequest({
      orderId: "order-1",
      symbol: "BTCUSDT",
      replacement,
    }),
  );

  assert.deepEqual(result, order);
});
