import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { Fill } from "../../fill/fill";

export interface BinanceFillClient {
  getOrderFills(orderId: string, symbol: string): Promise<readonly Fill[]>;
}

export interface BinanceFillClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
}

interface BinanceTradeResponse {
  id: number;
  orderId: number;
  symbol: string;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
}

function toNumber(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid Binance numeric value: ${value}`);
  }
  return number;
}

async function signedRequest<T>(
  options: BinanceFillClientOptions,
  method: "GET",
  path: string,
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

  const { createHmac } = await import("node:crypto");
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
      "X-MBX-APIKEY": options.apiKey,
    },
  });

  return response.data;
}

function mapFill(response: BinanceTradeResponse): Fill {
  const price = toNumber(response.price);
  const quantity = toNumber(response.qty);

  return {
    id: String(response.id),
    orderId: String(response.orderId),
    exchange: "binance",
    symbol: response.symbol,
    side: response.isBuyer ? "buy" : "sell",
    price,
    quantity,
    quoteQuantity: toNumber(response.quoteQty) || price * quantity,
    fee: toNumber(response.commission),
    feeAsset: response.commissionAsset,
    timestamp: response.time,
  };
}

export function createBinanceFillClient(
  options: BinanceFillClientOptions,
): BinanceFillClient {
  return {
    async getOrderFills(orderId, symbol) {
      const response = await signedRequest<BinanceTradeResponse[]>(
        options,
        "GET",
        "/api/v3/myTrades",
        {
          symbol: symbol.trim().toUpperCase(),
          orderId,
        },
      );

      return response.map(mapFill);
    },
  };
}
