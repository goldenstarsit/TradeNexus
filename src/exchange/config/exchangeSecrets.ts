export interface ExchangeSecrets {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase?: string;
}

export function hasExchangeCredentials(secrets: ExchangeSecrets): boolean {
  return secrets.apiKey.trim().length > 0 && secrets.apiSecret.trim().length > 0;
}
