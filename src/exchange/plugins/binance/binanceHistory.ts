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

interface BinanceHistoryOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
}

interface BinanceOrderHistoryResponse {
  readonly symbol: string;
  readonly orderId: string | number;
  readonly clientOrderId?: string;
  readonly price?: string | number;
  readonly origQty?: string | number;
  readonly executedQty?: string | number;
  readonly status: string;
  readonly type: string;
  readonly side: string;
  readonly time: number;
  readonly updateTime: number;
}

interface BinanceTradeHistoryResponse {
  readonly symbol: string;
  readonly id: string | number;
  readonly orderId: string | number;
  readonly price: string | number;
  readonly qty: string | number;
  readonly quoteQty?: string | number;
  readonly commission: string | number;
  readonly commissionAsset: string;
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

function finiteNumber(
  value: string | number | undefined,
  field: string,
): number {
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
      return "partiallyFilled";
    case "FILLED":
      return "filled";
    case "CANCELED":
      return "canceled";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
    default:
      throw new Error(`Unsupported Binance order status: ${status}`);
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
      throw new Error(`Unsupported Binance order type: ${type}`);
  }
}

function mapOrder(
  exchange: string,
  payload: BinanceOrderHistoryResponse,
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

  return createOrder({
    id: String(payload.orderId),
    ...(payload.clientOrderId
      ? { clientOrderId: payload.clientOrderId }
      : {}),
    exchange,
    symbol: requiredString(payload.symbol, "Symbol").toUpperCase(),
    side:
      payload.side.toUpperCase() === "BUY"
        ? "buy"
        : payload.side.toUpperCase() === "SELL"
          ? "sell"
          : (() => {
              throw new Error(`Unsupported Binance order side: ${payload.side}`);
            })(),
    type: mapOrderType(payload.type),
    status: mapOrderStatus(payload.status),
    ...(price === undefined ? {} : { price }),
    quantity,
    executedQuantity,
    createdAt: payload.time,
    updatedAt: payload.updateTime,
  });
}

function mapFill(
  exchange: string,
  payload: BinanceTradeHistoryResponse,
): Fill {
  const quantity = finiteNumber(payload.qty, "Fill quantity");
  const price = finiteNumber(payload.price, "Fill price");

  const quoteQuantity =
    payload.quoteQty === undefined
      ? price * quantity
      : finiteNumber(payload.quoteQty, "Quote quantity");

  return createFill({
    id: String(payload.id),
    orderId: String(payload.orderId),
    exchange,
    symbol: requiredString(payload.symbol, "Symbol").toUpperCase(),
    side: payload.isBuyer ? "buy" : "sell",
    price,
    quantity,
    quoteQuantity,
    fee: finiteNumber(payload.commission, "Commission"),
    feeAsset: requiredString(payload.commissionAsset, "Commission asset"),
    timestamp: payload.time,
  });
}

export class BinanceHistoryClient
  implements ExchangeOrderHistoryClient, ExchangeTradeHistoryClient
{
  private readonly httpClient: ExchangeHttpClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly recvWindow: number | undefined;
  private readonly now: () => number;

  constructor(options: BinanceHistoryOptions) {
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
      throw new Error("Binance order history requires a symbol");
    }

    if (query.clientOrderId !== undefined) {
      throw new Error(
        "Binance allOrders does not support clientOrderId filtering",
      );
    }

    if (query.orderId !== undefined) {
      throw new Error(
        "Binance allOrders does not support orderId filtering",
      );
    }

    if (query.statuses !== undefined) {
      throw new Error(
        "Binance allOrders does not support status filtering",
      );
    }

    const response = await this.httpClient.request<
      BinanceOrderHistoryResponse[]
    >({
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
          : { limit: String(query.limit) }),
        ...(this.recvWindow === undefined
          ? {}
          : { recvWindow: String(this.recvWindow) }),
        timestamp: String(this.now()),
      },
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    });

    return Object.freeze(
      response.data.map((order) => mapOrder("binance", order)),
    );
  }

  async getTradeHistory(
    input: ExchangeTradeHistoryQuery = {},
  ): Promise<readonly Fill[]> {
    const query = createTradeHistoryQuery(input);

    if (!query.symbol) {
      throw new Error("Binance trade history requires a symbol");
    }

    const response = await this.httpClient.request<
      BinanceTradeHistoryResponse[]
    >({
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
          : { limit: String(query.limit) }),
        ...(this.recvWindow === undefined
          ? {}
          : { recvWindow: String(this.recvWindow) }),
        timestamp: String(this.now()),
      },
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    });

    return Object.freeze(
      response.data.map((fill) => mapFill("binance", fill)),
    );
  }
}
