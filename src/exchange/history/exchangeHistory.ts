import type { Fill } from "../fill/fill";
import type { Order, OrderStatus } from "../order/order";

export interface ExchangeOrderHistoryQuery {
  readonly symbol?: string;
  readonly orderId?: string;
  readonly clientOrderId?: string;
  readonly statuses?: readonly OrderStatus[];
  readonly startTime?: number;
  readonly endTime?: number;
  readonly limit?: number;
}

export interface ExchangeTradeHistoryQuery {
  readonly symbol?: string;
  readonly orderId?: string;
  readonly startTime?: number;
  readonly endTime?: number;
  readonly limit?: number;
}

export interface ExchangeOrderHistoryClient {
  getOrderHistory(
    query?: ExchangeOrderHistoryQuery,
  ): Promise<readonly Order[]>;
}

export interface ExchangeTradeHistoryClient {
  getTradeHistory(
    query?: ExchangeTradeHistoryQuery,
  ): Promise<readonly Fill[]>;
}

function normalizeOptionalString(
  value: string | undefined,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} cannot be empty`);
  }

  return normalized;
}

function validateOptionalTimestamp(
  value: number | undefined,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite number greater than or equal to zero`);
  }

  return value;
}

function validateOptionalLimit(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Limit must be a positive integer");
  }

  return value;
}

function normalizeQuery(
  query: ExchangeOrderHistoryQuery,
): ExchangeOrderHistoryQuery {
  const symbol = normalizeOptionalString(query.symbol, "Symbol")?.toUpperCase();
  const orderId = normalizeOptionalString(query.orderId, "Order ID");
  const clientOrderId = normalizeOptionalString(
    query.clientOrderId,
    "Client order ID",
  );
  const startTime = validateOptionalTimestamp(query.startTime, "Start time");
  const endTime = validateOptionalTimestamp(query.endTime, "End time");
  const limit = validateOptionalLimit(query.limit);

  if (
    startTime !== undefined &&
    endTime !== undefined &&
    startTime > endTime
  ) {
    throw new Error("Start time cannot be greater than end time");
  }

  const statuses =
    query.statuses === undefined
      ? undefined
      : Object.freeze([...query.statuses]);

  return Object.freeze({
    ...(symbol === undefined ? {} : { symbol }),
    ...(orderId === undefined ? {} : { orderId }),
    ...(clientOrderId === undefined ? {} : { clientOrderId }),
    ...(statuses === undefined ? {} : { statuses }),
    ...(startTime === undefined ? {} : { startTime }),
    ...(endTime === undefined ? {} : { endTime }),
    ...(limit === undefined ? {} : { limit }),
  });
}

export function createOrderHistoryQuery(
  query: ExchangeOrderHistoryQuery = {},
): ExchangeOrderHistoryQuery {
  return normalizeQuery(query);
}

export function createTradeHistoryQuery(
  query: ExchangeTradeHistoryQuery = {},
): ExchangeTradeHistoryQuery {
  const symbol = normalizeOptionalString(query.symbol, "Symbol")?.toUpperCase();
  const orderId = normalizeOptionalString(query.orderId, "Order ID");
  const startTime = validateOptionalTimestamp(query.startTime, "Start time");
  const endTime = validateOptionalTimestamp(query.endTime, "End time");
  const limit = validateOptionalLimit(query.limit);

  if (
    startTime !== undefined &&
    endTime !== undefined &&
    startTime > endTime
  ) {
    throw new Error("Start time cannot be greater than end time");
  }

  return Object.freeze({
    ...(symbol === undefined ? {} : { symbol }),
    ...(orderId === undefined ? {} : { orderId }),
    ...(startTime === undefined ? {} : { startTime }),
    ...(endTime === undefined ? {} : { endTime }),
    ...(limit === undefined ? {} : { limit }),
  });
}
