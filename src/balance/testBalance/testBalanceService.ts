import type { BalanceAmount } from "../balanceAccount";
import { createBalanceContextProvider } from "../balanceContext";
import { createTestBalanceAccountProvider } from "../testBalanceAccountProvider";
import type { TestBalanceAccount } from "../testBalanceAccount";

const contextProvider = createBalanceContextProvider();
const provider = createTestBalanceAccountProvider();

function normalizeAccountId(accountId: string): string {
  const normalized = accountId.trim();

  if (!normalized) {
    throw new Error("Balance account ID must not be empty");
  }

  return normalized;
}

function getAccount(accountId: string): TestBalanceAccount {
  const normalizedAccountId = normalizeAccountId(accountId);
  const context = contextProvider.getContext(normalizedAccountId, "test");

  return provider.getTestAccount(context);
}

export function getTestBalance(
  accountId: string,
  asset: string,
): BalanceAmount {
  return getAccount(accountId).getBalance(asset);
}

export function depositTestBalance(
  accountId: string,
  asset: string,
  amount: number,
): BalanceAmount {
  const account = getAccount(accountId);

  account.deposit(asset, amount);

  return account.getBalance(asset);
}

export function withdrawTestBalance(
  accountId: string,
  asset: string,
  amount: number,
): BalanceAmount {
  const account = getAccount(accountId);

  account.withdraw(asset, amount);

  return account.getBalance(asset);
}

export function getTestBalanceAccount(
  accountId: string,
): TestBalanceAccount {
  return getAccount(accountId);
}

export function getTestBalanceProvider() {
  return provider;
}
