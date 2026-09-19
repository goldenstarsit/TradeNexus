import type { BalanceAmount, BalanceAccount } from "./balanceAccount";
import type { BalanceContext } from "./balanceContext";

export interface TestBalanceAccount extends BalanceAccount {
  deposit(asset: string, amount: number): void;
  withdraw(asset: string, amount: number): void;
  reserve(asset: string, amount: number): void;
  release(asset: string, amount: number): void;
  fill(asset: string, amount: number): void;
}

function normalizeAsset(asset: string): string {
  const normalized = asset.trim().toUpperCase();

  if (!normalized) {
    throw new Error("Balance asset must not be empty");
  }

  return normalized;
}

function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Balance amount must be greater than zero");
  }
}

export function createTestBalanceAccount(
  context: BalanceContext,
  initialBalances: Record<string, number> = {},
): TestBalanceAccount {
  if (context.mode !== "test") {
    throw new Error("Test balance account requires test balance mode");
  }

  const balances = new Map<string, { available: number; reserved: number }>();

  for (const [asset, amount] of Object.entries(initialBalances)) {
    validateAmount(amount);

    const normalizedAsset = normalizeAsset(asset);

    balances.set(normalizedAsset, {
      available: amount,
      reserved: 0,
    });
  }

  function stateFor(asset: string) {
    const normalizedAsset = normalizeAsset(asset);

    const state = balances.get(normalizedAsset);

    if (!state) {
      balances.set(normalizedAsset, {
        available: 0,
        reserved: 0,
      });

      return balances.get(normalizedAsset)!;
    }

    return state;
  }

  return {
    context,

    getBalance(asset): BalanceAmount {
      const normalizedAsset = normalizeAsset(asset);
      const state = stateFor(normalizedAsset);

      return Object.freeze({
        asset: normalizedAsset,
        available: state.available,
        reserved: state.reserved,
        total: state.available + state.reserved,
      });
    },

    deposit(asset, amount) {
      validateAmount(amount);

      const state = stateFor(asset);
      state.available += amount;
    },

    withdraw(asset, amount) {
      validateAmount(amount);
      const normalizedAsset = normalizeAsset(asset);
      const state = stateFor(normalizedAsset);

      if (state.available < amount) {
        throw new Error(`Insufficient available ${normalizedAsset} balance`);
      }

      state.available -= amount;
    },

    reserve(asset, amount) {

      const state = stateFor(asset);

      if (state.available < amount) {
        throw new Error(`Insufficient available ${normalizeAsset(asset)} balance`);
      }

      state.available -= amount;
      state.reserved += amount;
    },

    release(asset, amount) {
      validateAmount(amount);

      const state = stateFor(asset);

      if (state.reserved < amount) {
        throw new Error(`Insufficient reserved ${normalizeAsset(asset)} balance`);
      }

      state.reserved -= amount;
      state.available += amount;
    },

    fill(asset, amount) {
      validateAmount(amount);

      const state = stateFor(asset);

      if (state.reserved < amount) {
        throw new Error(`Insufficient reserved ${normalizeAsset(asset)} balance`);
      }

      state.reserved -= amount;
    },
  };
}
