import test from "node:test";
import assert from "node:assert/strict";
import {
  EXCHANGE_ERROR_CODES,
  ExchangeError,
  isExchangeError,
  isExchangeErrorCode,
} from "../exchangeError";

test("exchange error codes expose a stable runtime contract", () => {
  assert.deepEqual(EXCHANGE_ERROR_CODES, [
    "NETWORK_ERROR",
    "TIMEOUT",
    "AUTHENTICATION_ERROR",
    "RATE_LIMIT",
    "INVALID_REQUEST",
    "EXCHANGE_ERROR",
    "UNKNOWN_ERROR",
  ]);

  assert.equal(isExchangeErrorCode("RATE_LIMIT"), true);
  assert.equal(isExchangeErrorCode("INVALID"), false);
  assert.equal(isExchangeErrorCode(123), false);
});

test("exchange error validates and normalizes context", () => {
  const error = new ExchangeError(
    " binance ",
    "RATE_LIMIT",
    " Too many requests ",
  );

  assert.equal(error.name, "ExchangeError");
  assert.equal(error.message, "Too many requests");
  assert.equal(error.exchange, "binance");
  assert.equal(error.code, "RATE_LIMIT");
  assert.equal(isExchangeError(error), true);
  assert.equal(error instanceof Error, true);
});

test("exchange error preserves cause", () => {
  const cause = new Error("network failure");
  const error = new ExchangeError(
    "mexc",
    "NETWORK_ERROR",
    "Exchange HTTP request failed",
    cause,
  );

  assert.equal(error.cause, cause);
  assert.equal(isExchangeError(error), true);
});

test("exchange error rejects invalid runtime values", () => {
  assert.throws(
    () => new ExchangeError("", "RATE_LIMIT", "Too many requests"),
    /Exchange cannot be empty/,
  );

  assert.throws(
    () => new ExchangeError("binance", "INVALID" as never, "Failure"),
    /Unsupported exchange error code: INVALID/,
  );

  assert.throws(
    () => new ExchangeError("binance", "RATE_LIMIT", ""),
    /Error message cannot be empty/,
  );
});

test("exchange error is immutable", () => {
  const error = new ExchangeError(
    "htx",
    "AUTHENTICATION_ERROR",
    "Invalid credentials",
  );

  assert.equal(Object.isFrozen(error), true);
  assert.throws(() => {
    (error as { exchange: string }).exchange = "mexc";
  });
});
