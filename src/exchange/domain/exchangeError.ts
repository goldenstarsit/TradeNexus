export type ExchangeErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMIT"
  | "INVALID_REQUEST"
  | "EXCHANGE_ERROR"
  | "UNKNOWN_ERROR";

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
    super(message);
    this.name = "ExchangeError";
    this.exchange = exchange;
    this.code = code;
    this.cause = cause;
  }
}
