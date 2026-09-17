export interface Balance {
  readonly asset: string;
  readonly free: number;
  readonly locked: number;
}

export interface BalanceSnapshot {
  readonly exchange: string;
  readonly balances: readonly Balance[];
  readonly timestamp: number;
}

export function getTotalBalance(balance: Balance): number {
  return balance.free + balance.locked;
}

export function getAvailableBalance(balance: Balance): number {
  return balance.free;
}

export function findBalance(
  snapshot: BalanceSnapshot,
  asset: string,
): Balance | undefined {
  const normalizedAsset = asset.trim().toUpperCase();
  return snapshot.balances.find(
    (balance) => balance.asset.trim().toUpperCase() === normalizedAsset,
  );
}
