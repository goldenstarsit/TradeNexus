export interface ExchangeSecrets {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase?: string;
}

function normalizeRequiredSecret(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

export function createExchangeSecrets(input: {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase?: string;
}): ExchangeSecrets {
  const passphrase =
    input.passphrase === undefined
      ? undefined
      : normalizeRequiredSecret(input.passphrase, "Passphrase");

  return Object.freeze({
    apiKey: normalizeRequiredSecret(input.apiKey, "API key"),
    apiSecret: normalizeRequiredSecret(input.apiSecret, "API secret"),
    ...(passphrase === undefined ? {} : { passphrase }),
  });
}

export function hasExchangeCredentials(
  secrets: Partial<ExchangeSecrets>,
): boolean {
  return (
    typeof secrets.apiKey === "string" &&
    secrets.apiKey.trim().length > 0 &&
    typeof secrets.apiSecret === "string" &&
    secrets.apiSecret.trim().length > 0
  );
}
