import test from "node:test";
import assert from "node:assert/strict";
import { createExchangeHttpClient } from "../index";
import { ExchangeError } from "../../domain/exchangeError";

test("HTTP client builds requests and parses JSON", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await client.request<{ ok: boolean }>({
    method: "POST",
    path: "/api/v1/test",
    query: { symbol: "BTCUSDT", limit: 10 },
    body: { test: true },
  });

  assert.equal(capturedUrl, "https://api.example.com/api/v1/test?symbol=BTCUSDT&limit=10");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(capturedInit?.body, JSON.stringify({ test: true }));
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { ok: true });
});

test("HTTP client maps authentication and rate-limit errors", async () => {
  for (const [status, code] of [[401, "AUTHENTICATION_ERROR"], [429, "RATE_LIMIT"]] as const) {
    const client = createExchangeHttpClient({
      exchange: "binance",
      baseUrl: "https://api.example.com",
      fetchImpl: async () => new Response("error", { status }), 
    });

    await assert.rejects(
      client.request({ method: "GET", path: "/test" }),
      (error: unknown) => error instanceof ExchangeError && error.code === code,
    );
  }
});

test("HTTP client converts network failures and timeouts", async () => {
  const networkClient = createExchangeHttpClient({
    exchange: "htx",
    baseUrl: "https://api.example.com",
    fetchImpl: async () => { throw new Error("offline"); },
  });

  await assert.rejects(
    networkClient.request({ method: "GET", path: "/test" }),
    (error: unknown) => error instanceof ExchangeError && error.code === "NETWORK_ERROR",
  );

  const timeoutClient = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    defaultTimeoutMs: 1,
    fetchImpl: async (_url, init) => await new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }),
  });

  await assert.rejects(
    timeoutClient.request({ method: "GET", path: "/test" }),
    (error: unknown) => error instanceof ExchangeError && error.code === "TIMEOUT",
  );
});

test("HTTP client validates base URL, exchange and timeout configuration", () => {
  assert.throws(
    () =>
      createExchangeHttpClient({
        exchange: "",
        baseUrl: "https://api.example.com",
      }),
    /Exchange cannot be empty/,
  );

  assert.throws(
    () =>
      createExchangeHttpClient({
        exchange: "mexc",
        baseUrl: "not-a-url",
      }),
    /Base URL must be a valid URL/,
  );

  assert.throws(
    () =>
      createExchangeHttpClient({
        exchange: "mexc",
        baseUrl: "ftp://api.example.com",
      }),
    /Base URL must use HTTP or HTTPS/,
  );

  assert.throws(
    () =>
      createExchangeHttpClient({
        exchange: "mexc",
        baseUrl: "https://api.example.com",
        defaultTimeoutMs: 0,
      }),
    /Default timeout must be a finite number greater than zero/,
  );
});

test("HTTP client validates per-request timeout", async () => {
  const client = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  await assert.rejects(
    client.request({
      method: "GET",
      path: "/test",
      timeoutMs: 0,
    }),
    /Request timeout must be a finite number greater than zero/,
  );
});
