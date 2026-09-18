import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type {
  ExchangeOrderHistoryClient,
  ExchangeOrderHistoryQuery,
  ExchangeTradeHistoryClient,
  ExchangeTradeHistoryQuery,
} from "../../history/exchangeHistory";
import { createOrderHistoryQuery, createTradeHistoryQuery } from "../../history/exchangeHistory";
import { createOrder, type Order } from "../../order/order";
import { createFill, type Fill } from "../../fill/fill";

interface MexcHistoryOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
}

interface MexcOrderHistoryResponse {
  readonly symbol: string;
  readonly orderId: string | number;
  readonly clientOrderId?: string;
  readonly price?: string | number;
  readonly origQty?: string | number;
  readonly executedQty?: string | number;
  readonly status: string;
  readonly type: string;
  readonly side: string;
  readonly time?: number;
  readonly updateTime?: number;
}

interface MexcTradeHistoryResponse {
  readonly symbol: string;
  readonly id: string | number;
  readonly orderId: string | number;
  readonly price: string | number;
  readonly qty: string | number;
  readonly quoteQty?: string | number;
  readonly commission?: string | number;
  readonly commissionAsset?: string;
  readonly time: number;
  readonly isBuyer: boolean;
}

function requiredString(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} cannot be empty`);
  }

  return normalized;
}

function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }

  return value;
}

function finiteNumber(value: string | number | undefined, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a finite number`);
  }

  return parsed;
}

function mapOrderStatus(status: string): Order["status"] {
  switch (status.toUpperCase()) {
    case "NEW":
      return "new";
    case "PARTIALLY_FILLED":
    case "PARTIALLY_CANCELED":
      return "partiallyFilled";
    case "FILLED":
      return "filled";
    case "CANCELED":
    case "CANCELLED":
      return "canceled";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
    default:
      throw new Error(`Unsupported MEXC order status: ${status}`);
  }
}

function mapOrderType(type: string): Order["type"] {
  switch (type.toUpperCase()) {
    case "LIMIT":
      return "limit";
    case "LIMIT_MAKER":
      return "makerOnly";
    case "MARKET":
      return "market";
    default:
      throw new Error(`Unsupported MEXC order type: ${type}`);
  }
}

function mapOrder(
  exchange: string,
  payload: MexcOrderHistoryResponse,
): Order {
  const quantity = finiteNumber(payload.origQty, "Order quantity");
  const executedQuantity = finiteNumber(
    payload.executedQty ?? 0,
    "Executed quantity",
  );

  const price =
    payload.price === undefined
      ? undefined
      : finiteNumber(payload.price, "Order price");

  const createdAt = payload.time ?? Date.now();
  const updatedAt = payload.updateTime ?? createdAt;

  return createOrder({
    id: String(payload.orderId),
    ...(payload.clientOrderId
      ? { clientOrderId: payload.clientOrderId }
      : {}),
    exchange,
    symbol: requiredString(payload.symbol, "Symbol").toUpperCase(),
    side: payload.side.toLowerCase() === "buy" ? "buy" : "sell",
    type: mapOrderType(payload.type),
    status: mapOrderStatus(payload.status),
    ...(price === undefined ? {} : { price }),
    quantity,
    executedQuantity,
    createdAt,
    updatedAt,
  });
}

function mapFill(
  exchange: string,
  payload: MexcTradeHistoryResponse,
): Fill {
  const quantity = finiteNumber(payload.qty, "Fill quantity");
  const price = finiteNumber(payload.price, "Fill price");
  const quoteQuantity =
    payload.quoteQty === undefined
      ? price * quantity
      : finiteNumber(payload.quoteQty, "Quote quantity");

  const fee =
    payload.commission === undefined
      ? 0
      : finiteNumber(payload.commission, "Commission");

  return createFill({
    id: String(payload.id),
    orderId: String(payload.orderId),
    exchange,
    symbol: requiredString(payload.symbol, "Symbol").toUpperCase(),
    side: payload.isBuyer ? "buy" : "sell",
    price,
    quantity,
    quoteQuantity,
    fee,
    feeAsset: payload.commissionAsset?.trim().toUpperCase() || "UNKNOWN",
    timestamp: payload.time,
  });
}

export class MexcHistoryClient
  implements ExchangeOrderHistoryClient, ExchangeTradeHistoryClient
{
  private readonly httpClient: ExchangeHttpClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly recvWindow: number | undefined;
  private readonly now: () => number;

  constructor(options: MexcHistoryOptions) {
    this.httpClient = options.httpClient;
    this.apiKey = requiredString(options.apiKey, "API key");
    this.apiSecret = requiredString(options.apiSecret, "API secret");
    this.recvWindow = options.recvWindow;
    this.now = options.now ?? Date.now;
  }

  async getOrderHistory(
    input: ExchangeOrderHistoryQuery = {},
  ): Promise<readonly Order[]> {
    const query = createOrderHistoryQuery(input);

    if (!query.symbol) {
      throw new Error("MEXC order history requires a symbol");
    }

    if (query.clientOrderId !== undefined) {
      throw new Error(
        "MEXC allOrders does not support clientOrderId filtering",
      );
    }

    if (query.orderId !== undefined) {
      throw new Error(
        "MEXC allOrders does not support orderId filtering",
      );
    }

    if (query.statuses !== undefined) {
      throw new Error(
        "MEXC allOrders does not support status filtering",
      );
    }

    const response = await this.httpClient.request<MexcOrderHistoryResponse[]>({
      method: "GET",
      path: "/api/v3/allOrders",
      query: {
        symbol: query.symbol,
        ...(query.startTime === undefined
          ? {}
          : { startTime: String(query.startTime) }),
        ...(query.endTime === undefined
          ? {}
          : { endTime: String(query.endTime) }),
        ...(query.limit === undefined
          ? {}
          : { limit: String(positiveInteger(query.limit, "Limit")) }),
        ...(this.recvWindow === undefined
          ? {}
          : { recvWindow: String(this.recvWindow) }),
        timestamp: String(this.now()),
      },
    });

    return Object.freeze(
      response.data.map((order) => mapOrder("mexc", order)),
    );
  }

  async getTradeHistory(
    input: ExchangeTradeHistoryQuery = {},
  ): Promise<readonly Fill[]> {
    const query = createTradeHistoryQuery(input);

    if (!query.symbol) {
      throw new Error("MEXC trade history requires a symbol");
    }

    const response = await this.httpClient.request<MexcTradeHistoryResponse[]>({
      method: "GET",
      path: "/api/v3/myTrades",
      query: {
        symbol: query.symbol,
        ...(query.orderId === undefined
          ? {}
          : { orderId: query.orderId }),
        ...(query.startTime === undefined
          ? {}
          : { startTime: String(query.startTime) }),
        ...(query.endTime === undefined
          ? {}
          : { endTime: String(query.endTime) }),
        ...(query.limit === undefined
          ? {}
          : { limit: String(positiveInteger(query.limit, "Limit")) }),
        ...(this.recvWindow === undefined
          ? {}
          : { recvWindow: String(this.recvWindow) }),
        timestamp: String(this.now()),
      },
    });

    return Object.freeze(
      response.data.map((fill) => mapFill("mexc", fill)),
    );
  }
}
