import type { BalanceAmount, BalanceAccount } from "./balanceAccount";
import type { BalanceContext } from "./balanceContext";

export interface TestBalanceState {
  available: number;
  reserved: number;
}

export type TestBalancePersistence = (
  context: BalanceContext,
  asset: string,
  state: TestBalanceState,
) => void;

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
  persistence?: TestBalancePersistence,
  initialStates: Record<string, TestBalanceState> = {},
): TestBalanceAccount {
  if (context.mode !== "test") {
    throw new Error("Test balance account requires test balance mode");
  }

  const balances = new Map<string, TestBalanceState>();

  for (const [asset, amount] of Object.entries(initialBalances)) {
    validateAmount(amount);

    const normalizedAsset = normalizeAsset(asset);

    const initialState = initialStates[normalizedAsset];

    balances.set(normalizedAsset, {
      available: amount,
      reserved: initialState?.reserved ?? 0,
    });
  }

  function stateFor(asset: string): TestBalanceState {
    const normalizedAsset = normalizeAsset(asset);

    const state = balances.get(normalizedAsset);

    if (!state) {
      const newState = {
        available: 0,
        reserved: 0,
      };

      balances.set(normalizedAsset, newState);

      return newState;
    }

    return state;
  }

  function persist(asset: string, state: TestBalanceState): void {
    persistence?.(context, normalizeAsset(asset), state);
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

      const normalizedAsset = normalizeAsset(asset);
      const state = stateFor(normalizedAsset);

      state.available += amount;
      persist(normalizedAsset, state);
    },

    withdraw(asset, amount) {
      validateAmount(amount);

      const normalizedAsset = normalizeAsset(asset);
      const state = stateFor(normalizedAsset);

      if (state.available < amount) {
        throw new Error(`Insufficient available ${normalizedAsset} balance`);
      }

      state.available -= amount;
      persist(normalizedAsset, state);
    },

    reserve(asset, amount) {
      validateAmount(amount);

      const normalizedAsset = normalizeAsset(asset);
      const state = stateFor(normalizedAsset);

      if (state.available < amount) {
        throw new Error(`Insufficient available ${normalizedAsset} balance`);
      }

      state.available -= amount;
      state.reserved += amount;
      persist(normalizedAsset, state);
    },

    release(asset, amount) {
      validateAmount(amount);

      const normalizedAsset = normalizeAsset(asset);
      const state = stateFor(normalizedAsset);

      if (state.reserved < amount) {
        throw new Error(`Insufficient reserved ${normalizedAsset} balance`);
      }

      state.reserved -= amount;
      state.available += amount;
      persist(normalizedAsset, state);
    },

    fill(asset, amount) {
      validateAmount(amount);

      const normalizedAsset = normalizeAsset(asset);
      const state = stateFor(normalizedAsset);

      if (state.reserved < amount) {
        throw new Error(`Insufficient reserved ${normalizedAsset} balance`);
      }

      state.reserved -= amount;
      persist(normalizedAsset, state);
    },
  };
}
