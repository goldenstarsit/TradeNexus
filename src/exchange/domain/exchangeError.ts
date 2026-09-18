export const EXCHANGE_ERROR_CODES = [
  "NETWORK_ERROR",
  "TIMEOUT",
  "AUTHENTICATION_ERROR",
  "RATE_LIMIT",
  "INVALID_REQUEST",
  "EXCHANGE_ERROR",
  "UNKNOWN_ERROR",
] as const;

export type ExchangeErrorCode = (typeof EXCHANGE_ERROR_CODES)[number];

export function isExchangeErrorCode(value: unknown): value is ExchangeErrorCode {
  return (
    typeof value === "string" &&
    (EXCHANGE_ERROR_CODES as readonly string[]).includes(value)
  );
}

function validateRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

export class ExchangeError extends Error {
  readonly exchange: string;
  readonly code: ExchangeErrorCode;
  readonly cause: unknown;

  constructor(
    exchange: string,
    code: ExchangeErrorCode,
    message: string,
    cause?: unknown,
  ) {
    const normalizedExchange = validateRequiredString(exchange, "Exchange");

    if (!isExchangeErrorCode(code)) {
      throw new Error(`Unsupported exchange error code: ${String(code)}`);
    }

    const normalizedMessage = validateRequiredString(message, "Error message");

    super(normalizedMessage);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "ExchangeError";
    this.exchange = normalizedExchange;
    this.code = code;
    this.cause = cause;

    Object.freeze(this);
  }
}

export function isExchangeError(error: unknown): error is ExchangeError {
  return error instanceof ExchangeError;
}
