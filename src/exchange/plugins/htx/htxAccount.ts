import { createHmac } from "node:crypto";
import type { ExchangeHttpClient } from "../../http/exchangeHttpClient";
import { createBalance, createBalanceSnapshot, type Balance, type BalanceSnapshot } from "../../balance/balance";

export interface HtxAccountClient {
  getBalances(asset?: string): Promise<BalanceSnapshot>;
}

export interface HtxAccountCredentials {
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

interface HtxBalanceResponse {
  status: string;
  data: {
    id: number;
    type: string;
    state: string;
    list: Array<{
      currency: string;
      type: "trade" | "frozen" | string;
      balance: string | number;
    }>;
  };
}

function validateCredentials(credentials: HtxAccountCredentials): void {
  if (!credentials.apiKey.trim()) {
    throw new Error("HTX API key cannot be empty");
  }

  if (!credentials.apiSecret.trim()) {
    throw new Error("HTX API secret cannot be empty");
  }
}

function validateHost(host: string): string {
  const normalized = host.trim();

  if (!normalized) {
    throw new Error("HTX host cannot be empty");
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
  credentials: HtxAccountCredentials,
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

function toNumber(value: string | number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid HTX balance value: ${value}`);
  }
  return number;
}

function normalizeAsset(asset: string): string {
  return asset.trim().toUpperCase();
}

function mapBalances(
  response: HtxBalanceResponse,
  exchange: "htx",
): BalanceSnapshot {
  const balances = new Map<string, { free: number; locked: number }>();

  for (const entry of response.data.list) {
    const symbol = normalizeAsset(entry.currency);
    const current = balances.get(symbol) ?? { free: 0, locked: 0 };
    const value = toNumber(entry.balance);

    if (entry.type === "trade") {
      current.free += value;
    } else if (entry.type === "frozen") {
      current.locked += value;
    }

    balances.set(symbol, current);
  }

  const mapped: Balance[] = [...balances.entries()].map(
    ([asset, values]) =>
      createBalance({
        asset,
        free: values.free,
        locked: values.locked,
      }),
  );

  return createBalanceSnapshot({
    exchange,
    balances: mapped,
    timestamp: Date.now(),
  });
}

export function createHtxAccountClient(
  httpClient: ExchangeHttpClient,
  credentials: HtxAccountCredentials,
  host = "api.huobi.pro",
): HtxAccountClient {
  validateCredentials(credentials);

  const normalizedHost = validateHost(host);

  return {
    async getBalances(asset) {
      const accountsPath = "/v1/account/accounts";
      const accountsQuery = createAuthQuery(
        credentials,
        normalizedHost,
        accountsPath,
      );

      const accountsResponse =
        await httpClient.request<HtxAccountsResponse>({
          method: "GET",
          path: accountsPath,
          query: accountsQuery,
        });

      const account = accountsResponse.data.data.find(
        (item) => item.type === "spot" && item.state === "working",
      );

      if (!account) {
        throw new Error("HTX spot trading account was not found");
      }

      const balancePath = `/v1/account/accounts/${account.id}/balance`;
      const balanceQuery = createAuthQuery(
        credentials,
        normalizedHost,
        balancePath,
      );

      const balanceResponse =
        await httpClient.request<HtxBalanceResponse>({
          method: "GET",
          path: balancePath,
          query: balanceQuery,
        });

      const snapshot = mapBalances(balanceResponse.data, "htx");

      if (asset === undefined) {
        return snapshot;
      }

      const normalizedAsset = normalizeAsset(asset);

      return {
        ...snapshot,
        balances: snapshot.balances.filter(
          (balance) => balance.asset === normalizedAsset,
        ),
      };
    },
  };
}
