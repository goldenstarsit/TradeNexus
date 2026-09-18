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

function normalizeRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function normalizeAsset(value: string): string {
  return normalizeRequiredString(value, "Asset").toUpperCase();
}

function validateNonNegativeFinite(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number`);
  }

  return value;
}

function validateTimestamp(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Timestamp must be a finite non-negative number");
  }

  return value;
}

export function createBalance(input: {
  readonly asset: string;
  readonly free: number;
  readonly locked: number;
}): Balance {
  return Object.freeze({
    asset: normalizeAsset(input.asset),
    free: validateNonNegativeFinite(input.free, "Free balance"),
    locked: validateNonNegativeFinite(input.locked, "Locked balance"),
  });
}

export function createBalanceSnapshot(input: {
  readonly exchange: string;
  readonly balances: readonly Balance[];
  readonly timestamp: number;
}): BalanceSnapshot {
  const exchange = normalizeRequiredString(input.exchange, "Exchange");

  const balances = input.balances.map((balance) =>
    createBalance({
      asset: balance.asset,
      free: balance.free,
      locked: balance.locked,
    }),
  );

  const assets = balances.map((balance) => balance.asset);

  if (new Set(assets).size !== assets.length) {
    throw new Error("Duplicate balance assets are not allowed");
  }

  return Object.freeze({
    exchange,
    balances: Object.freeze(balances),
    timestamp: validateTimestamp(input.timestamp),
  });
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
  const normalizedAsset = normalizeAsset(asset);

  return snapshot.balances.find(
    (balance) => balance.asset === normalizedAsset,
  );
}
