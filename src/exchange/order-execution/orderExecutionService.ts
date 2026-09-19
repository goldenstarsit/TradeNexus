import { isExchangeError, type ExchangeError } from "../domain/exchangeError";
import type { Fill } from "../fill/fill";
import {
  createOrderExecutionResult,
  type ExecutionAttempt,
  type OrderExecutionResult,
} from "../execution-result/orderExecutionResult";
import type { Order, OrderSide } from "../order/order";
import type { OrderType } from "../order-type/orderType";
import type { ExchangePlugin } from "../plugin/exchangePlugin";
import {
  getOrderExecutionModeDefinition,
  type OrderExecutionMode,
} from "./orderExecutionMode";

export interface OrderExecutionRequest {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly quantity: number;
  readonly makerPrice?: number;
  readonly clientOrderId?: string;
  readonly executionMode: OrderExecutionMode;
}

export interface OrderExecutionService {
  execute(
    request: OrderExecutionRequest,
  ): Promise<OrderExecutionResult>;
}

function now(): number {
  return Date.now();
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;

  if (value instanceof Error) {
    return `${value.name} ${value.message}`;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isMakerLiquidityRejection(error: unknown): boolean {
  if (!isExchangeError(error)) {
    return false;
  }

  const exchangeError = error as ExchangeError;
  const text = [
    exchangeError.message,
    stringifyUnknown(exchangeError.cause),
  ]
    .join(" ")
    .toLowerCase();

  const makerTerms = [
    "maker",
    "post only",
    "post-only",
    "limit_maker",
    "limit-maker",
  ];

  const liquidityTerms = [
    "liquidity",
    "immediately match",
    "would match",
    "would take",
    "take liquidity",
    "cross",
  ];

  return (
    makerTerms.some((term) => text.includes(term)) &&
    liquidityTerms.some((term) => text.includes(term))
  );
}

function createAttempt(
  type: "maker" | "taker",
  status: "success" | "failed",
  timestamp: number,
  order?: Order,
  reason?: string,
): ExecutionAttempt {
  return Object.freeze({
    type,
    status,
    ...(order === undefined ? {} : { orderId: order.id }),
    ...(reason === undefined ? {} : { reason }),
    timestamp,
  });
}

async function getFills(
  plugin: ExchangePlugin,
  order: Order,
  symbol: string,
): Promise<readonly Fill[]> {
  if (order.executedQuantity <= 0) {
    return [];
  }

  return plugin.getOrderFills(order.id, symbol);
}

function resultFromOrder(input: {
  readonly order: Order;
  readonly exchange: string;
  readonly request: OrderExecutionRequest;
  readonly executionType: "maker" | "taker";
  readonly fills: readonly Fill[];
  readonly attempts: readonly ExecutionAttempt[];
  readonly createdAt: number;
  readonly executedAt?: number;
}): OrderExecutionResult {
  const status =
    input.order.status === "filled"
      ? "filled"
      : input.order.status === "partiallyFilled"
        ? "partiallyFilled"
        : "failed";

  return createOrderExecutionResult({
    orderId: input.order.id,
    clientOrderId: input.order.clientOrderId,
    exchange: input.exchange,
    symbol: input.request.symbol,
    side: input.request.side,
    executionMode: input.request.executionMode,
    executionType: input.executionType,
    status,
    requestedQuantity: input.request.quantity,
    fills: input.fills,
    attempts: input.attempts,
    reportedExecutedQuantity: input.order.executedQuantity,
    createdAt: input.createdAt,
    executedAt: input.executedAt,
    updatedAt: input.order.updatedAt,
  });
}

function failedResult(input: {
  readonly exchange: string;
  readonly request: OrderExecutionRequest;
  readonly executionType: "maker" | "taker";
  readonly attempts: readonly ExecutionAttempt[];
  readonly reason: string;
  readonly createdAt: number;
}): OrderExecutionResult {
  return createOrderExecutionResult({
    exchange: input.exchange,
    symbol: input.request.symbol,
    side: input.request.side,
    executionMode: input.request.executionMode,
    executionType: input.executionType,
    status: "failed",
    requestedQuantity: input.request.quantity,
    fills: [],
    attempts: input.attempts,
    createdAt: input.createdAt,
    updatedAt: now(),
  });
}

export function createOrderExecutionService(
  plugin: ExchangePlugin,
): OrderExecutionService {
  async function execute(
    request: OrderExecutionRequest,
  ): Promise<OrderExecutionResult> {
    const createdAt = now();
    const definition = getOrderExecutionModeDefinition(
      request.executionMode,
    );

    if (
      definition.allowsMaker &&
      request.makerPrice === undefined
    ) {
      throw new Error(
        "makerPrice is required for maker-capable execution modes",
      );
    }

    const attempts: ExecutionAttempt[] = [];

    if (!definition.allowsMaker) {
      const order = await plugin.placeOrder({
        symbol: request.symbol,
        side: request.side,
        type: "market" satisfies OrderType,
        quantity: request.quantity,
        ...(request.clientOrderId === undefined
          ? {}
          : { clientOrderId: request.clientOrderId }),
      });

      attempts.push(
        createAttempt("taker", "success", now(), order),
      );

      const fills = await getFills(plugin, order, request.symbol);

      return resultFromOrder({
        order,
        exchange: plugin.metadata.id,
        request,
        executionType: "taker",
        fills,
        attempts,
            createdAt,
        executedAt: order.status === "filled" ? order.updatedAt : undefined,
      });
    }

    let makerOrder: Order;
    let makerFills: readonly Fill[];

    try {
      makerOrder = await plugin.placeOrder({
        symbol: request.symbol,
        side: request.side,
        type: "makerOnly" satisfies OrderType,
        quantity: request.quantity,
        price: request.makerPrice,
        ...(request.clientOrderId === undefined
          ? {}
          : { clientOrderId: request.clientOrderId }),
      });

      attempts.push(
        createAttempt("maker", "success", now(), makerOrder),
      );

      makerFills = await getFills(plugin, makerOrder, request.symbol);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error);

      attempts.push(
        createAttempt("maker", "failed", now(), undefined, reason),
      );

      if (
        request.executionMode !== "hybrid" ||
        !isMakerLiquidityRejection(error)
      ) {
        return failedResult({
          exchange: plugin.metadata.id,
          request,
          executionType: "maker",
          attempts,
          reason,
          createdAt,
        });
      }

      makerOrder = undefined as never;
      makerFills = [];
    }

    if (makerOrder !== undefined) {
      return resultFromOrder({
        order: makerOrder,
        exchange: plugin.metadata.id,
        request,
        executionType: "maker",
        fills: makerFills,
        attempts,
        createdAt,
        executedAt:
          makerOrder.status === "filled"
            ? makerOrder.updatedAt
            : undefined,
      });
    }

    const takerOrder = await plugin.placeOrder({
      symbol: request.symbol,
      side: request.side,
      type: "market" satisfies OrderType,
      quantity: request.quantity,
      ...(request.clientOrderId === undefined
        ? {}
        : { clientOrderId: request.clientOrderId }),
    });

    attempts.push(
      createAttempt("taker", "success", now(), takerOrder),
    );

    const fills = await getFills(
      plugin,
      takerOrder,
      request.symbol,
    );

    return resultFromOrder({
      order: takerOrder,
      exchange: plugin.metadata.id,
      request,
      executionType: "taker",
      fills,
      attempts,
      createdAt,
      executedAt:
        takerOrder.status === "filled"
          ? takerOrder.updatedAt
          : undefined,
    });
  }

  return Object.freeze({
    execute,
  });
}
