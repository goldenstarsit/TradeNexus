import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { Fill } from "../../fill/fill";

export interface HtxFillClient {
  getOrderFills(orderId: string, symbol: string): Promise<readonly Fill[]>;
}

export interface HtxFillCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

export interface HtxFillClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly credentials: HtxFillCredentials;
  readonly host?: string;
  readonly now?: () => Date;
}

interface HtxMatchResult {
  id: string | number;
  "trade-id"?: string | number;
  "order-id": string | number;
  symbol: string;
  price: string | number;
  "filled-amount": string | number;
  "filled-fees": string | number;
  "fee-currency"?: string;
  type: string;
  "created-at": number;
}

interface HtxMatchResultsResponse {
  status: string;
  data: HtxMatchResult[];
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
  credentials: HtxFillCredentials,
  host: string,
  path: string,
  now: () => Date,
): Record<string, string> {
  const params: Record<string, string> = {
    AccessKeyId: credentials.apiKey,
    SignatureMethod: "HmacSHA256",
    SignatureVersion: "2",
    Timestamp: now().toISOString().replace(/\.\d{3}Z$/, ""),
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

function toNumber(value: string | number): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid HTX fill numeric value: ${value}`);
  }

  return number;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function mapSide(type: string): "buy" | "sell" {
  if (type.startsWith("buy-")) return "buy";
  if (type.startsWith("sell-")) return "sell";

  throw new Error(`Invalid HTX fill order type: ${type}`);
}

function mapFill(response: HtxMatchResult): Fill {
  const price = toNumber(response.price);
  const quantity = toNumber(response["filled-amount"]);

  return {
    id: String(response["trade-id"] ?? response.id),
    orderId: String(response["order-id"]),
    exchange: "htx",
    symbol: normalizeSymbol(response.symbol),
    side: mapSide(response.type),
    price,
    quantity,
    quoteQuantity: price * quantity,
    fee: toNumber(response["filled-fees"]),
    feeAsset: response["fee-currency"] ?? "",
    timestamp: response["created-at"],
  };
}

export function createHtxFillClient(
  options: HtxFillClientOptions,
): HtxFillClient {
  const host = options.host ?? "api.huobi.pro";
  const now = options.now ?? (() => new Date());

  return {
    async getOrderFills(orderId, symbol) {
      const path = `/v1/order/orders/${orderId}/matchresults`;
      const query = createAuthQuery(
        options.credentials,
        host,
        path,
        now,
      );

      const response =
        await options.httpClient.request<HtxMatchResultsResponse>({
          method: "GET",
          path,
          query,
        });

      const expectedSymbol = normalizeSymbol(symbol);

      return response.data.data
        .filter(
          (fill) => normalizeSymbol(fill.symbol) === expectedSymbol,
        )
        .map(mapFill);
    },
  };
}
