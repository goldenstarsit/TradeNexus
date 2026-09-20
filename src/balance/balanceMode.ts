export const BALANCE_MODES = ["live", "test"] as const;

export type BalanceMode = (typeof BALANCE_MODES)[number];

export function isBalanceMode(value: string): value is BalanceMode {
  return BALANCE_MODES.includes(value as BalanceMode);
}
