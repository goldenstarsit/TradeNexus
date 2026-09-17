import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { Order, OrderStatus } from "../../order/order";
import type { OrderSide } from "../../order/order";
import type { OrderType } from "../../order-type";

export interface HtxOrderRequest {
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price?: number;
  readonly clientOrderId?: string;
}

export interface HtxOrderClient {
  placeOrder(request: HtxOrderRequest): Promise<Order>;
  getOrder(orderId: string, symbol: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<readonly Order[]>;
  cancelOrder(orderId: string, symbol: string): Promise<Order>;
  cancelAllOrders(symbol?: string): Promise<readonly Order[]>;
}

export interface HtxOrderCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

interface HtxAccountsResponse {
  status: string;
  data: Array<{
    id: number;
    type: string;
    state: string;
  }>;
}

interface HtxPlaceOrderResponse {
  status: string;
  data: string | number;
}

interface HtxCancelResponse {
  status: string;
  data: string | number | null;
}

interface HtxOrderResponse {
  status: string;
  data: HtxOrderPayload;
}

interface HtxOpenOrdersResponse {
  status: string;
  data: HtxOrderPayload[];
}

interface HtxOrderPayload {
  id: string | number;
  "client-order-id"?: string;
  symbol: string;
  amount: string | number;
  price?: string | number;
  "created-at": number;
  type: string;
  "filled-amount"?: string | number;
  state: string;
}

function encode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function buildSignature(
  method: string,
  host: string,
  path: string,
  params: Record<string, string>,
  secret: string,
): string {
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join("&");

  const payload = [
    method.toUpperCase(),
    host,
    path,
    canonicalQuery,
  ].join("\n");

  return createHmac("sha256", secret)
    .update(payload)
    .digest("base64");
}

function createAuthQuery(
  credentials: HtxOrderCredentials,
  host: string,
  path: string,
): Record<string, string> {
  const params: Record<string, string> = {
    AccessKeyId: credentials.apiKey,
    SignatureMethod: "HmacSHA256",
    SignatureVersion: "2",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, ""),
  };

  params.Signature = buildSignature(
    "GET",
    host,
    path,
    params,
    credentials.apiSecret,
  );

  return params;
}

function createPostAuthQuery(
  credentials: HtxOrderCredentials,
  host: string,
  path: string,
): Record<string, string> {
  const params: Record<string, string> = {
    AccessKeyId: credentials.apiKey,
    SignatureMethod: "HmacSHA256",
    SignatureVersion: "2",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, ""),
  };

  params.Signature = buildSignature(
    "POST",
    host,
    path,
    params,
    credentials.apiSecret,
  );

  return params;
}

function toNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid HTX order numeric value: ${value}`);
  }

  return number;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toLowerCase();
}

function mapStatus(state: string, filled: number, amount: number): OrderStatus {
  switch (state) {
    case "filled":
      return "filled";
    case "canceled":
    case "partial-canceled":
      return filled > 0 ? "partiallyFilled" : "canceled";
    case "rejected":
      return "rejected";
    case "partial-filled":
      return "partiallyFilled";
    case "created":
    case "submitted":
      if (filled >= amount && amount > 0) return "filled";
      if (filled > 0) return "partiallyFilled";
      return "open";
    default:
      return "open";
  }
}

function mapOrder(payload: HtxOrderPayload): Order {
  const quantity = toNumber(payload.amount);
  const executedQuantity = toNumber(payload["filled-amount"]);

  return {
    id: String(payload.id),
    clientOrderId: payload["client-order-id"],
    exchange: "htx",
    symbol: payload.symbol.toUpperCase(),
    side: payload.type.startsWith("sell") ? "sell" : "buy",
    type: payload.type.includes("market")
      ? "market"
      : payload.type.includes("limit-maker")
        ? "makerOnly"
        : "limit",
    status: mapStatus(payload.state, executedQuantity, quantity),
    price: payload.price === undefined ? undefined : toNumber(payload.price),
    quantity,
    executedQuantity,
    remainingQuantity: Math.max(0, quantity - executedQuantity),
    createdAt: payload["created-at"],
    updatedAt: payload["created-at"],
  };
}

function mapOrderSideType(
  side: OrderSide,
  type: OrderType,
): string {
  const prefix = side === "buy" ? "buy" : "sell";

  switch (type) {
    case "market":
      return `${prefix}-market`;
    case "limit":
      return `${prefix}-limit`;
    case "makerOnly":
      return `${prefix}-limit-maker`;
    default:
      throw new Error(`HTX order type is not supported: ${type}`);
  }
}

export function createHtxOrderClient(
  httpClient: ExchangeHttpClient,
  credentials: HtxOrderCredentials,
  host = "api.huobi.pro",
): HtxOrderClient {
  let cachedAccountId: string | undefined;

  async function getSpotAccountId(): Promise<string> {
    if (cachedAccountId) return cachedAccountId;

    const path = "/v1/account/accounts";
    const query = createAuthQuery(credentials, host, path);

    const response = await httpClient.request<HtxAccountsResponse>({
      method: "GET",
      path,
      query,
    });

    const account = response.data.data.find(
      (item) => item.type === "spot" && item.state === "working",
    );

    if (!account) {
      throw new Error("HTX spot trading account was not found");
    }

    cachedAccountId = String(account.id);
    return cachedAccountId;
  }

  return {
    async placeOrder(request) {
      const path = "/v1/order/orders/place";
      const accountId = await getSpotAccountId();

      if (request.quantity <= 0) {
        throw new Error("HTX order quantity must be greater than zero");
      }

      const type = mapOrderSideType(request.side, request.type);

      if (request.type !== "market" && request.price === undefined) {
        throw new Error("HTX limit orders require a price");
      }

      const query = createPostAuthQuery(credentials, host, path);

      const body: Record<string, string> = {
        "account-id": accountId,
        amount: String(request.quantity),
        source: "spot-api",
        symbol: normalizeSymbol(request.symbol),
        type,
      };

      if (request.price !== undefined) {
        body.price = String(request.price);
      }

      if (request.clientOrderId !== undefined) {
        body["client-order-id"] = request.clientOrderId;
      }

      const response =
        await httpClient.request<HtxPlaceOrderResponse>({
          method: "POST",
          path,
          query,
          body,
        });

      const orderId = String(response.data.data);

      return this.getOrder(orderId, request.symbol);
    },

    async getOrder(orderId, symbol) {
      const path = `/v1/order/orders/${orderId}`;
      const query = createAuthQuery(credentials, host, path);

      const response = await httpClient.request<HtxOrderResponse>({
        method: "GET",
        path,
        query,
      });

      const order = mapOrder(response.data.data);

      if (order.symbol !== symbol.trim().toUpperCase()) {
        throw new Error(
          `HTX order symbol mismatch: expected ${symbol}, received ${order.symbol}`,
        );
      }

      return order;
    },

    async getOpenOrders(symbol) {
      const path = "/v1/order/openOrders";
      const query = createAuthQuery(credentials, host, path);

      const params: Record<string, string | number> = {
        ...query,
        "account-id": await getSpotAccountId(),
      };

      if (symbol !== undefined) {
        params.symbol = normalizeSymbol(symbol);
      }

      const response =
        await httpClient.request<HtxOpenOrdersResponse>({
          method: "GET",
          path,
          query: params,
        });

      return response.data.data.map(mapOrder);
    },

    async cancelOrder(orderId, symbol) {
      const path = `/v1/order/orders/${orderId}/submitcancel`;
      const query = createPostAuthQuery(credentials, host, path);

      const response = await httpClient.request<HtxCancelResponse>({
        method: "POST",
        path,
        query,
      });

      if (response.data.data !== null && response.data.data !== undefined) {
        const returnedId = String(response.data.data);

        if (returnedId !== orderId) {
          throw new Error(
            `HTX cancel order ID mismatch: expected ${orderId}, received ${returnedId}`,
          );
        }
      }

      return this.getOrder(orderId, symbol);
    },

    async cancelAllOrders(symbol) {
      const path = "/v1/order/orders/batchCancelOpenOrders";
      const accountId = await getSpotAccountId();
      const query = createPostAuthQuery(credentials, host, path);

      const body: Record<string, string> = {
        "account-id": accountId,
      };

      if (symbol !== undefined) {
        body.symbol = normalizeSymbol(symbol);
      }

      await httpClient.request<HtxCancelResponse>({
        method: "POST",
        path,
        query,
        body,
      });

      return this.getOpenOrders(symbol);
    },
  };
}
