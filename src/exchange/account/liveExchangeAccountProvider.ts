import { createExchangeHttpClient } from "../http";
import type { ExchangeId } from "../domain/exchangeId";
import { createExchangeConfig } from "../config";
import type { BalanceSnapshot } from "../balance/balance";
import type { ExchangeAccountClient } from "./exchangeAccountManager";
import { createBinanceAccountClient } from "../plugins/binance/binanceAccount";
import { createMexcAccountClient } from "../plugins/mexc/mexcAccount";
import { createHtxAccountClient } from "../plugins/htx/htxAccount";

interface ExchangeEnvironmentCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

function getCredentials(exchangeId: ExchangeId): ExchangeEnvironmentCredentials {
  const names = {
    binance: ["BINANCE_API_KEY", "BINANCE_API_SECRET"],
    mexc: ["MEXC_API_KEY", "MEXC_API_SECRET"],
    htx: ["HTX_API_KEY", "HTX_API_SECRET"],
  } as const;

  const [apiKeyName, apiSecretName] = names[exchangeId];

  const apiKey = process.env[apiKeyName]?.trim() ?? "";
  const apiSecret = process.env[apiSecretName]?.trim() ?? "";

  if (!apiKey || !apiSecret) {
    throw new Error(
      `${exchangeId.toUpperCase()} API credentials are not configured`,
    );
  }

  return { apiKey, apiSecret };
}

export interface LiveExchangeAccountProvider {
  getAccount(exchangeId: ExchangeId): ExchangeAccountClient;
  getBalances(
    exchangeId: ExchangeId,
    asset?: string,
  ): Promise<BalanceSnapshot>;
}

export function createLiveExchangeAccountProvider(): LiveExchangeAccountProvider {
  const accounts = new Map<ExchangeId, ExchangeAccountClient>();

  function createAccount(exchangeId: ExchangeId): ExchangeAccountClient {
    const existing = accounts.get(exchangeId);

    if (existing) {
      return existing;
    }

    const credentials = getCredentials(exchangeId);
    const config = createExchangeConfig(exchangeId);

    const httpClient = createExchangeHttpClient({
      exchange: config.id,
      baseUrl: config.baseUrl,
      defaultTimeoutMs: 30_000,
    });

    let account: ExchangeAccountClient;

    switch (exchangeId) {
      case "binance":
        account = createBinanceAccountClient({
          httpClient,
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          recvWindow: 5000,
        });
        break;

      case "mexc":
        account = createMexcAccountClient({
          httpClient,
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          recvWindow: 5000,
        });
        break;

      case "htx":
        account = createHtxAccountClient(
          httpClient,
          {
            apiKey: credentials.apiKey,
            apiSecret: credentials.apiSecret,
          },
          new URL(config.baseUrl).host,
        );
        break;
    }

    accounts.set(exchangeId, account);

    return account;
  }

  return {
    getAccount(exchangeId) {
      return createAccount(exchangeId);
    },

    async getBalances(exchangeId, asset) {
      return createAccount(exchangeId).getBalances(asset);
    },
  };
}
