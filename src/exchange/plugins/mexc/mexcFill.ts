import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { Fill } from "../../fill/fill";

export interface MexcFillClient {
  getOrderFills(orderId: string, symbol: string): Promise<readonly Fill[]>;
}

export interface MexcFillClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
}

interface MexcTradeResponse {
  id: string | number;
  orderId: string | number;
  symbol: string;
  price: string;
  qty: string;
  quoteQty?: string;
  commission?: string;
  commissionAsset?: string;
  time: number;
  isBuyer: boolean;
}

function toNumber(value: string | undefined, fallback = 0): number {
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

async function signedRequest<T>(
  options: MexcFillClientOptions,
  params: Record<string, string | number>,
): Promise<T> {
  const timestamp = (options.now ?? Date.now)();
  const recvWindow = options.recvWindow ?? 5000;

  const query = {
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
    method: "GET",
    path: "/api/v3/myTrades",
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

function mapFill(response: MexcTradeResponse): Fill {
  const price = toNumber(response.price);
  const quantity = toNumber(response.qty);

  return {
    id: String(response.id),
    orderId: String(response.orderId),
    exchange: "mexc",
    symbol: normalizeSymbol(response.symbol),
    side: response.isBuyer ? "buy" : "sell",
    price,
    quantity,
    quoteQuantity:
      response.quoteQty === undefined
        ? price * quantity
        : toNumber(response.quoteQty),
    fee: toNumber(response.commission),
    feeAsset: response.commissionAsset ?? "",
    timestamp: response.time,
  };
}

export function createMexcFillClient(
  options: MexcFillClientOptions,
): MexcFillClient {
  return {
    async getOrderFills(orderId, symbol) {
      const response = await signedRequest<MexcTradeResponse[]>(
        options,
        {
          symbol: normalizeSymbol(symbol),
          orderId,
        },
      );

      return response.map(mapFill);
    },
  };
}
