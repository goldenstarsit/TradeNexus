import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import type { Balance, BalanceSnapshot } from "../../balance/balance";

export interface MexcAccountClient {
  getBalances(asset?: string): Promise<BalanceSnapshot>;
}

export interface MexcAccountClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
}

interface MexcAccountResponse {
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

function toNumber(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid MEXC numeric value: ${value}`);
  }
  return number;
}

function createSignature(queryString: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");
}

export function createMexcAccountClient(
  options: MexcAccountClientOptions,
): MexcAccountClient {
  const recvWindow = options.recvWindow ?? 5000;
  const now = options.now ?? Date.now;

  return {
    async getBalances(asset) {
      const timestamp = now();

      const query: Record<string, string | number> = {
        recvWindow,
        timestamp,
      };

      const queryString = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, String(value)]),
      ).toString();

      const signature = createSignature(queryString, options.apiSecret);

      const response = await options.httpClient.request<MexcAccountResponse>({
        method: "GET",
        path: "/api/v3/account",
        query: {
          ...query,
          signature,
        },
        headers: {
          "X-MEXC-APIKEY": options.apiKey,
        },
      });

      const balances: Balance[] = response.data.balances.map((balance) => ({
        asset: balance.asset,
        free: toNumber(balance.free),
        locked: toNumber(balance.locked),
      }));

      const normalizedAsset = asset?.trim().toUpperCase();

      return {
        exchange: "mexc",
        balances: normalizedAsset
          ? balances.filter(
              (balance) => balance.asset.trim().toUpperCase() === normalizedAsset,
            )
          : balances,
        timestamp,
      };
    },
  };
}
