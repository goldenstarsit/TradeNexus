import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import {
  createBalance,
  createBalanceSnapshot,
  type Balance,
  type BalanceSnapshot,
} from "../../balance/balance";

export interface MexcAccountClient {
  getBalances(asset?: string): Promise<BalanceSnapshot>;
}

export interface MexcAccountClientOptions {
  readonly httpClient: ExchangeHttpClient;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly recvWindow?: number;
  readonly now?: () => number;
  readonly getServerTime?: () => Promise<number>;
}

interface MexcTimeResponse {
  serverTime: number;
}

interface MexcAccountResponse {
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

function validateCredentials(apiKey: string, apiSecret: string): void {
  if (!apiKey.trim()) {
    throw new Error("MEXC API key must not be empty");
  }

  if (!apiSecret.trim()) {
    throw new Error("MEXC API secret must not be empty");
  }
}

function validateRecvWindow(recvWindow: number): number {
  if (!Number.isInteger(recvWindow) || recvWindow <= 0) {
    throw new Error("MEXC recvWindow must be a positive integer");
  }

  return recvWindow;
}

function validateServerTime(serverTime: number): number {
  if (!Number.isFinite(serverTime) || serverTime <= 0) {
    throw new Error(`Invalid MEXC server time: ${serverTime}`);
  }

  return Math.trunc(serverTime);
}

function toNumber(value: string): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid MEXC numeric value: ${value}`);
  }

  return number;
}

function createSignature(
  queryString: string,
  apiSecret: string,
): string {
  return createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");
}

export function createMexcAccountClient(
  options: MexcAccountClientOptions,
): MexcAccountClient {
  validateCredentials(options.apiKey, options.apiSecret);

  const recvWindow = validateRecvWindow(options.recvWindow ?? 5000);
  const now = options.now ?? Date.now;

  const getServerTime =
    options.getServerTime ??
    (async () => {
      const response = await options.httpClient.request<MexcTimeResponse>({
        method: "GET",
        path: "/api/v3/time",
      });

      return validateServerTime(response.data.serverTime);
    });

  return {
    async getBalances(asset) {
      const localTimestamp = now();
      const serverTimestamp = validateServerTime(await getServerTime());

      const timestamp =
        Math.abs(serverTimestamp - localTimestamp) > recvWindow
          ? serverTimestamp
          : localTimestamp;

      const query: Record<string, string | number> = {
        recvWindow,
        timestamp,
      };

      const queryString = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, String(value)]),
      ).toString();

      const signature = createSignature(
        queryString,
        options.apiSecret,
      );

      const response =
        await options.httpClient.request<MexcAccountResponse>({
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

      const balances: Balance[] = response.data.balances.map(
        (balance) =>
          createBalance({
            asset: balance.asset,
            free: toNumber(balance.free),
            locked: toNumber(balance.locked),
          }),
      );

      const normalizedAsset = asset?.trim().toUpperCase();

      return createBalanceSnapshot({
        exchange: "mexc",
        balances: normalizedAsset
          ? balances.filter(
              (balance) => balance.asset === normalizedAsset,
            )
          : balances,
        timestamp,
      });
    },
  };
}
