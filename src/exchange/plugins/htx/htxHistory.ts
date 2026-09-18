import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type {
  ExchangeOrderHistoryClient,
  ExchangeOrderHistoryQuery,
  ExchangeTradeHistoryClient,
  ExchangeTradeHistoryQuery,
} from "../../history/exchangeHistory";
import {
  createOrderHistoryQuery,
  createTradeHistoryQuery,
} from "../../history/exchangeHistory";
import { createFill, type Fill } from "../../fill/fill";
import { createOrder, type Order } from "../../order/order";

export interface HtxHistoryCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

export interface HtxHistoryClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly credentials: HtxHistoryCredentials;
  readonly host?: string;
  readonly now?: () => Date;
}

interface HtxOrderHistoryPayload {
  readonly id: string | number;
  readonly "client-order-id"?: string;
  readonly symbol: string;
  readonly amount: string | number;
  readonly price?: string | number;
  readonly "created-at": number;
  readonly "finished-at"?: number;
  readonly type: string;
  readonly "filled-amount"?: string | number;
  readonly state: string;
}

interface HtxOrderHistoryResponse {
  readonly status: string;
  readonly data: HtxOrderHistoryPayload[];
}

interface HtxMatchResult {
  readonly id: string | number;
  readonly "trade-id"?: string | number;
  readonly "order-id": string | number;
  readonly symbol: string;
  readonly price: string | number;
  readonly "filled-amount": string | number;
  readonly "filled-fees": string | number;
  readonly "fee-currency"?: string;
  readonly type: string;
  readonly "created-at": number;
}

interface HtxMatchResultsResponse {
  readonly status: string;
  readonly data: HtxMatchResult[];
}

function requiredString(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} cannot be empty`);
  }

  return normalized;
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
  credentials: HtxHistoryCredentials,
  host: string,
  path: string,
  now: () => Date,
): Record<string, string> {
  const params: Record<string, string> = {
    AccessKeyId: requiredString(credentials.apiKey, "API key"),
    SignatureMethod: "HmacSHA256",
    SignatureVersion: "2",
    Timestamp: now().toISOString().replace(/\.\d{3}Z$/, ""),
  };

  params.Signature = buildSignature(
    "GET",
    host,
    path,
    params,
    requiredString(credentials.apiSecret, "API secret"),
  );

  return params;
}

function toNumber(value: string | number | undefined, field: string): number {
  if (value === undefined) return 0;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid HTX ${field}: ${value}`);
  }

  return number;
}

function normalizeSymbol(symbol: string): string {
  return requiredString(symbol, "Symbol").toUpperCase();
}

function mapSide(type: string): "buy" | "sell" {
  if (type.startsWith("buy-")) return "buy";
  if (type.startsWith("sell-")) return "sell";

  throw new Error(`Invalid HTX order side type: ${type}`);
}

function mapOrderType(type: string): Order["type"] {
  if (type.includes("limit-maker")) return "makerOnly";
  if (type.includes("market")) return "market";
  if (type.includes("limit")) return "limit";

  throw new Error(`Unsupported HTX order type: ${type}`);
}

function mapOrderStatus(
  state: string,
  executedQuantity: number,
  quantity: number,
): Order["status"] {
  switch (state) {
    case "filled":
      return "filled";

    case "canceled":
    case "partial-canceled":
      return executedQuantity > 0 ? "partiallyFilled" : "canceled";

    case "rejected":
      return "rejected";

    case "partial-filled":
      return "partiallyFilled";

    case "created":
    case "submitted":
      if (executedQuantity >= quantity && quantity > 0) return "filled";
      if (executedQuantity > 0) return "partiallyFilled";
      return "open";

    default:
      throw new Error(`Unsupported HTX order state: ${state}`);
  }
}

function mapOrder(payload: HtxOrderHistoryPayload): Order {
  const quantity = toNumber(payload.amount, "order quantity");
  const executedQuantity = toNumber(
    payload["filled-amount"],
    "executed order quantity",
  );

  const price =
    payload.price === undefined
      ? undefined
      : toNumber(payload.price, "order price");

  return createOrder({
    id: String(payload.id),
    ...(payload["client-order-id"]
      ? { clientOrderId: payload["client-order-id"] }
      : {}),
    exchange: "htx",
    symbol: normalizeSymbol(payload.symbol),
    side: mapSide(payload.type),
    type: mapOrderType(payload.type),
    status: mapOrderStatus(payload.state, executedQuantity, quantity),
    ...(price === undefined ? {} : { price }),
    quantity,
    executedQuantity,
    createdAt: payload["created-at"],
    updatedAt: payload["finished-at"] ?? payload["created-at"],
  });
}

function mapFill(payload: HtxMatchResult): Fill {
  const price = toNumber(payload.price, "fill price");
  const quantity = toNumber(
    payload["filled-amount"],
    "fill quantity",
  );

  const feeAsset =
    payload["fee-currency"] === undefined
      ? "UNKNOWN"
      : requiredString(payload["fee-currency"], "Fee currency");

  return createFill({
    id: String(payload["trade-id"] ?? payload.id),
    orderId: String(payload["order-id"]),
    exchange: "htx",
    symbol: normalizeSymbol(payload.symbol),
    side: mapSide(payload.type),
    price,
    quantity,
    quoteQuantity: price * quantity,
    fee: toNumber(payload["filled-fees"], "fill fee"),
    feeAsset,
    timestamp: payload["created-at"],
  });
}

export class HtxHistoryClient
  implements ExchangeOrderHistoryClient, ExchangeTradeHistoryClient
{
  private readonly httpClient: ExchangeHttpClient;
  private readonly credentials: HtxHistoryCredentials;
  private readonly host: string;
  private readonly now: () => Date;

  constructor(options: HtxHistoryClientOptions) {
    this.httpClient = options.httpClient;
    this.credentials = options.credentials;
    this.host = options.host ?? "api.huobi.pro";
    this.now = options.now ?? (() => new Date());
  }

  async getOrderHistory(
    input: ExchangeOrderHistoryQuery = {},
  ): Promise<readonly Order[]> {
    const query = createOrderHistoryQuery(input);

    if (!query.symbol) {
      throw new Error("HTX order history requires a symbol");
    }

    if (query.orderId !== undefined) {
      throw new Error(
        "HTX order history does not support orderId filtering",
      );
    }

    if (query.clientOrderId !== undefined) {
      throw new Error(
        "HTX order history does not support clientOrderId filtering",
      );
    }

    if (query.statuses !== undefined) {
      throw new Error(
        "HTX order history does not support status filtering",
      );
    }

    const path = "/v1/order/orders";
    const authQuery = createAuthQuery(
      this.credentials,
      this.host,
      path,
      this.now,
    );

    const requestQuery: Record<string, string> = {
      ...authQuery,
      symbol: query.symbol.toLowerCase(),
    };

    if (query.startTime !== undefined) {
      requestQuery["start-time"] = String(query.startTime);
    }

    if (query.endTime !== undefined) {
      requestQuery["end-time"] = String(query.endTime);
    }

    if (query.limit !== undefined) {
      requestQuery.size = String(query.limit);
    }

    const response =
      await this.httpClient.request<HtxOrderHistoryResponse>({
        method: "GET",
        path,
        query: requestQuery,
      });

    return Object.freeze(
      response.data.data.map(mapOrder),
    );
  }

  async getTradeHistory(
    input: ExchangeTradeHistoryQuery = {},
  ): Promise<readonly Fill[]> {
    const query = createTradeHistoryQuery(input);

    if (!query.symbol) {
      throw new Error("HTX trade history requires a symbol");
    }

    if (query.orderId !== undefined) {
      throw new Error(
        "HTX match history does not support orderId filtering",
      );
    }

    const path = "/v1/order/matchresults";
    const authQuery = createAuthQuery(
      this.credentials,
      this.host,
      path,
      this.now,
    );

    const requestQuery: Record<string, string> = {
      ...authQuery,
      symbol: query.symbol.toLowerCase(),
    };

    if (query.startTime !== undefined) {
      requestQuery["start-time"] = String(query.startTime);
    }

    if (query.endTime !== undefined) {
      requestQuery["end-time"] = String(query.endTime);
    }

    if (query.limit !== undefined) {
      requestQuery.size = String(query.limit);
    }

    const response =
      await this.httpClient.request<HtxMatchResultsResponse>({
        method: "GET",
        path,
        query: requestQuery,
      });

    return Object.freeze(
      response.data.data.map(mapFill),
    );
  }
}
