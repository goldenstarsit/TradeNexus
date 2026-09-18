import type { ExchangeId } from "../domain/exchangeId";
import { isExchangeId } from "../domain/exchangeId";
import type { BalanceSnapshot } from "../balance/balance";

export interface ExchangeAccountClient {
  getBalances(asset?: string): Promise<BalanceSnapshot>;
}

export interface ExchangeAccountManager {
  register(exchangeId: ExchangeId, account: ExchangeAccountClient): void;
  has(exchangeId: ExchangeId): boolean;
  get(exchangeId: ExchangeId): ExchangeAccountClient;
  getBalances(
    exchangeId: ExchangeId,
    asset?: string,
  ): Promise<BalanceSnapshot>;
  getAllBalances(asset?: string): Promise<readonly BalanceSnapshot[]>;
}

export function createExchangeAccountManager(
  accounts: ReadonlyMap<ExchangeId, ExchangeAccountClient> = new Map(),
): ExchangeAccountManager {
  const registry = new Map<ExchangeId, ExchangeAccountClient>(accounts);

  function register(
    exchangeId: ExchangeId,
    account: ExchangeAccountClient,
  ): void {
    if (!isExchangeId(exchangeId)) {
      throw new Error(`Unsupported exchange ID: ${String(exchangeId)}`);
    }

    if (!account || typeof account !== "object") {
      throw new Error("Exchange account must be an object");
    }

    if (typeof account.getBalances !== "function") {
      throw new Error("Exchange account getBalances method is missing");
    }

    if (registry.has(exchangeId)) {
      throw new Error(
        `Exchange account already registered: ${exchangeId}`,
      );
    }

    registry.set(exchangeId, account);
  }

  function get(exchangeId: ExchangeId): ExchangeAccountClient {
    const account = registry.get(exchangeId);

    if (!account) {
      throw new Error(
        `Exchange account not registered: ${exchangeId}`,
      );
    }

    return account;
  }

  return {
    register,
    has(exchangeId) {
      return registry.has(exchangeId);
    },
    get,
    async getBalances(exchangeId, asset) {
      return get(exchangeId).getBalances(asset);
    },
    async getAllBalances(asset) {
      const accounts = [...registry.entries()];

      return Promise.all(
        accounts.map(([, account]) => account.getBalances(asset)),
      );
    },
  };
}
