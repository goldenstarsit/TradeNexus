import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { Order, OrderSide, OrderStatus } from "../../order/order";
import type { OrderType } from "../../order-type/orderType";

export interface MexcOrderRequest {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price?: number;
  readonly clientOrderId?: string;
}

export interface MexcOrderClient {
  placeOrder(request: MexcOrderRequest): Promise<Order>;
  getOrder(orderId: string, symbol: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<readonly Order[]>;
  cancelOrder(orderId: string, symbol: string): Promise<Order>;
  cancelAllOrders(symbol: string): Promise<readonly Order[]>;
}

export interface MexcOrderClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
}

interface MexcOrderResponse {
  symbol: string;
  orderId: string | number;
  clientOrderId?: string;
  price?: string;
  origQty?: string;
  executedQty?: string;
  status?: string;
  type: string;
  side: string;
  time?: number;
  updateTime?: number;
  transactTime?: number;
}

function toNumber(value: string | number | undefined, fallback = 0): number {
  if (value === undefined) return fallback;

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid MEXC numeric value: ${value}`);
  }

  return number;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function mapSide(side: string): OrderSide {
  if (side === "BUY") return "buy";
  if (side === "SELL") return "sell";
  throw new Error(`Unsupported MEXC order side: ${side}`);
}

function mapOrderStatus(status: string | undefined): OrderStatus {
  switch (status) {
    case "NEW":
      return "new";
    case "PARTIALLY_FILLED":
      return "partiallyFilled";
    case "FILLED":
      return "filled";
    case "CANCELED":
    case "PARTIALLY_CANCELED":
      return "canceled";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
    default:
      return "new";
  }
}

function mapOrder(response: MexcOrderResponse, fallbackTimestamp: number): Order {
  const quantity = toNumber(response.origQty);
  const executedQuantity = toNumber(response.executedQty);

  return {
    id: String(response.orderId),
    clientOrderId: response.clientOrderId,
    exchange: "mexc",
    symbol: normalizeSymbol(response.symbol),
    side: mapSide(response.side),
    type:
      response.type === "LIMIT_MAKER"
        ? "makerOnly"
        : response.type.toLowerCase(),
    status: mapOrderStatus(response.status),
    price:
      response.price === undefined ? undefined : toNumber(response.price),
    quantity,
    executedQuantity,
    remainingQuantity: Math.max(0, quantity - executedQuantity),
    createdAt: response.time ?? response.transactTime ?? fallbackTimestamp,
    updatedAt:
      response.updateTime ??
      response.time ??
      response.transactTime ??
      fallbackTimestamp,
  };
}

function mapOrderType(type: OrderType): string {
  switch (type) {
    case "makerOnly":
      return "LIMIT_MAKER";
    case "limit":
      return "LIMIT";
    case "market":
      return "MARKET";
    default:
      throw new Error(`MEXC order type is not supported: ${type}`);
  }
}

export function createMexcOrderClient(
  options: MexcOrderClientOptions,
): MexcOrderClient {
  const recvWindow = options.recvWindow ?? 5000;
  const now = options.now ?? Date.now;

  async function signedRequest<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    const timestamp = now();

    const query: Record<string, string | number> = {
      ...params,
      recvWindow,
      timestamp,
    };

    const queryString = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [key, String(value)]),
    ).toString();

    const signature = createHmac("sha256", options.apiSecret)
      .update(queryString)
      .digest("hex");

    const response = await options.httpClient.request<T>({
      method,
      path,
      query: {
        ...query,
        signature,
      },
      headers: {
        "X-MEXC-APIKEY": options.apiKey,
      },
    });

    return response.data;
  }

  return {
    async placeOrder(request) {
      const symbol = normalizeSymbol(request.symbol);
      const type = mapOrderType(request.type);

      if (type !== "MARKET" && request.price === undefined) {
        throw new Error(`MEXC ${request.type} order requires price`);
      }

      const response = await signedRequest<MexcOrderResponse>(
        "POST",
        "/api/v3/order",
        {
          symbol,
          side: request.side === "buy" ? "BUY" : "SELL",
          type,
          quantity: request.quantity,
          ...(request.price === undefined ? {} : { price: request.price }),
          ...(request.clientOrderId === undefined
            ? {}
            : { newClientOrderId: request.clientOrderId }),
        },
      );

      return mapOrder(response, now());
    },

    async getOrder(orderId, symbol) {
      const timestamp = now();

      const response = await signedRequest<MexcOrderResponse>(
        "GET",
        "/api/v3/order",
        {
          symbol: normalizeSymbol(symbol),
          orderId,
        },
      );

      return mapOrder(response, timestamp);
    },

    async getOpenOrders(symbol) {
      const timestamp = now();

      const response = await signedRequest<MexcOrderResponse[]>(
        "GET",
        "/api/v3/openOrders",
        {
          symbol: normalizeSymbol(symbol ?? ""),
        },
      );

      return response.map((order) => mapOrder(order, timestamp));
    },

    async cancelOrder(orderId, symbol) {
      const timestamp = now();

      const response = await signedRequest<MexcOrderResponse>(
        "DELETE",
        "/api/v3/order",
        {
          symbol: normalizeSymbol(symbol),
          orderId,
        },
      );

      return mapOrder(response, timestamp);
    },

    async cancelAllOrders(symbol) {
      const timestamp = now();

      const response = await signedRequest<MexcOrderResponse[]>(
        "DELETE",
        "/api/v3/openOrders",
        {
          symbol: normalizeSymbol(symbol),
        },
      );

      return response.map((order) => mapOrder(order, timestamp));
    },
  };
}
