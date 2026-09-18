import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { Order, OrderSide, OrderStatus } from "../../order/order";
import { isOrderType, type OrderType } from "../../order-type/orderType";

export interface BinanceOrderRequest {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price?: number;
  readonly clientOrderId?: string;
}

export interface BinanceOrderClient {
  placeOrder(request: BinanceOrderRequest): Promise<Order>;
  getOrder(orderId: string, symbol: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<readonly Order[]>;
  cancelOrder(orderId: string, symbol: string): Promise<Order>;
  cancelAllOrders(symbol?: string): Promise<readonly Order[]>;
}

export interface BinanceOrderClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
}

interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  type: string;
  side: string;
  time: number;
  updateTime: number;
}

interface BinanceCancelAllResponse extends BinanceOrderResponse {}

function toNumber(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid Binance numeric value: ${value}`);
  }
  return number;
}

function createSignature(queryString: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");
}

function toBinanceOrderType(type: OrderType): string {
  switch (type) {
    case "makerOnly":
      return "LIMIT_MAKER";
    case "limit":
      return "LIMIT";
    case "market":
      return "MARKET";
    default:
      throw new Error(`Unsupported Binance order type: ${type}`);
  }
}

function toBinanceStatus(status: string): OrderStatus {
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
      return "open";
  }
}

function mapExchangeOrderType(value: string): OrderType {
  const normalized = value.toLowerCase();

  if (normalized === "limit_maker") {
    return "makerOnly";
  }

  if (!isOrderType(normalized)) {
    throw new Error(`Unsupported order type: ${value}`);
  }

  return normalized;
}

function mapOrder(
  response: BinanceOrderResponse,
): Order {
  const quantity = toNumber(response.origQty);
  const executedQuantity = toNumber(response.executedQty);

  return {
    id: String(response.orderId),
    clientOrderId: response.clientOrderId,
    exchange: "binance",
    symbol: response.symbol,
    side: response.side.toLowerCase() as OrderSide,
    type: mapExchangeOrderType(response.type),
    status: toBinanceStatus(response.status),
    price: toNumber(response.price),
    quantity,
    executedQuantity,
    remainingQuantity: Math.max(0, quantity - executedQuantity),
    createdAt: response.time,
    updatedAt: response.updateTime,
  };
}

export function createBinanceOrderClient(
  options: BinanceOrderClientOptions,
): BinanceOrderClient {
  const recvWindow = options.recvWindow ?? 5000;
  const now = options.now ?? Date.now;

  async function signedRequest<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    const timestamp = now();

    const query = {
      ...params,
      recvWindow,
      timestamp,
    };

    const queryString = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [key, String(value)]),
    ).toString();

    const signature = createSignature(queryString, options.apiSecret);

    const response = await options.httpClient.request<T>({
      method,
      path,
      query: {
        ...query,
        signature,
      },
      headers: {
        "X-MBX-APIKEY": options.apiKey,
      },
    });

    return response.data;
  }

  return {
    async placeOrder(request) {
      const symbol = request.symbol.trim().toUpperCase();
      const params: Record<string, string | number> = {
        symbol,
        side: request.side.toUpperCase(),
        type: toBinanceOrderType(request.type),
        quantity: request.quantity,
      };

      if (request.price !== undefined) {
        params.price = request.price;
        params.timeInForce = "GTC";
      }

      if (request.clientOrderId !== undefined) {
        params.newClientOrderId = request.clientOrderId;
      }

      const response = await signedRequest<BinanceOrderResponse>(
        "POST",
        "/api/v3/order",
        params,
      );

      return mapOrder(response);
    },

    async getOrder(orderId, symbol) {
      const response = await signedRequest<BinanceOrderResponse>(
        "GET",
        "/api/v3/order",
        {
          symbol: symbol.trim().toUpperCase(),
          orderId,
        },
      );

      return mapOrder(response);
    },

    async getOpenOrders(symbol) {
      const params: Record<string, string | number> = {};

      if (symbol !== undefined) {
        params.symbol = symbol.trim().toUpperCase();
      }

      const response = await signedRequest<BinanceOrderResponse[]>(
        "GET",
        "/api/v3/openOrders",
        params,
      );

      return response.map(mapOrder);
    },

    async cancelOrder(orderId, symbol) {
      const response = await signedRequest<BinanceOrderResponse>(
        "DELETE",
        "/api/v3/order",
        {
          symbol: symbol.trim().toUpperCase(),
          orderId,
        },
      );

      return mapOrder(response);
    },

    async cancelAllOrders(symbol) {
      if (symbol === undefined) {
        throw new Error("Binance cancelAllOrders requires a symbol");
      }

      const response = await signedRequest<BinanceCancelAllResponse[]>(
        "DELETE",
        "/api/v3/openOrders",
        {
          symbol: symbol.trim().toUpperCase(),
        },
      );

      return response.map(mapOrder);
    },
  };
}
