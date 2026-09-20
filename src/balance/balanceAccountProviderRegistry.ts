import type { BalanceAccount, BalanceAccountProvider } from "./balanceAccount";
import type { BalanceContext } from "./balanceContext";
import type { BalanceMode } from "./balanceMode";

export interface BalanceAccountProviderRegistry {
  register(mode: BalanceMode, provider: BalanceAccountProvider): void;
  has(mode: BalanceMode): boolean;
  get(mode: BalanceMode): BalanceAccountProvider;
  getAccount(context: BalanceContext): BalanceAccount;
}

export function createBalanceAccountProviderRegistry(
  providers: Partial<Record<BalanceMode, BalanceAccountProvider>> = {},
): BalanceAccountProviderRegistry {
  const registry = new Map<BalanceMode, BalanceAccountProvider>();

  for (const mode of ["live", "test"] as const) {
    const provider = providers[mode];

    if (provider) {
      registry.set(mode, provider);
    }
  }

  return {
    register(mode, provider) {
      if (registry.has(mode)) {
        throw new Error(
          `Balance account provider already registered for ${mode} mode`,
        );
      }

      registry.set(mode, provider);
    },

    has(mode) {
      return registry.has(mode);
    },

    get(mode) {
      const provider = registry.get(mode);

      if (!provider) {
        throw new Error(
          `No balance account provider registered for ${mode} mode`,
        );
      }

      return provider;
    },

    getAccount(context) {
      return this.get(context.mode).getAccount(context);
    },
  };
}
