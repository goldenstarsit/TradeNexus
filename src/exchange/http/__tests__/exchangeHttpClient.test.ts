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

  assert.equal(
    capturedUrl,
    "https://api.example.com/api/v1/test?symbol=BTCUSDT&limit=10",
  );
  assert.equal(capturedInit?.method, "POST");
  assert.equal(capturedInit?.body, JSON.stringify({ test: true }));
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { ok: true });
});

test("HTTP client maps authentication and rate-limit errors", async () => {
  for (const [status, code] of [
    [401, "AUTHENTICATION_ERROR"],
    [429, "RATE_LIMIT"],
  ] as const) {
    const client = createExchangeHttpClient({
      exchange: "binance",
      baseUrl: "https://api.example.com",
      fetchImpl: async () => new Response("error", { status }),
    });

    await assert.rejects(
      client.request({ method: "GET", path: "/test" }),
      (error: unknown) =>
        error instanceof ExchangeError && error.code === code,
    );
  }
});

test("HTTP client converts network failures and timeouts", async () => {
  const networkClient = createExchangeHttpClient({
    exchange: "htx",
    baseUrl: "https://api.example.com",
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });

  await assert.rejects(
    networkClient.request({ method: "GET", path: "/test" }),
    (error: unknown) =>
      error instanceof ExchangeError && error.code === "NETWORK_ERROR",
  );

  const timeoutClient = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    defaultTimeoutMs: 1,
    fetchImpl: async (_url, init) =>
      await new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  });

  await assert.rejects(
    timeoutClient.request({ method: "GET", path: "/test" }),
    (error: unknown) =>
      error instanceof ExchangeError && error.code === "TIMEOUT",
  );
});

test("HTTP client validates configuration", () => {
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
        baseUrl: "https://user:pass@api.example.com",
      }),
    /Base URL cannot contain credentials/,
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

  assert.throws(
    () =>
      createExchangeHttpClient({
        exchange: "mexc",
        baseUrl: "https://api.example.com",
        fetchImpl: null as unknown as typeof fetch,
      }),
    /Fetch implementation must be a function/,
  );
});

test("HTTP client validates request method and path", async () => {
  const client = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    fetchImpl: async () => new Response("ok", { status: 200 }),
  });

  await assert.rejects(
    client.request({
      method: "PATCH" as never,
      path: "/test",
    }),
    /Unsupported HTTP method/,
  );

  await assert.rejects(
    client.request({
      method: "GET",
      path: "",
    }),
    /Path cannot be empty/,
  );

  await assert.rejects(
    client.request({
      method: "GET",
      path: "https://other.example.com/test",
    }),
    /Path must be relative to the configured base URL/,
  );

  await assert.rejects(
    client.request({
      method: "GET",
      path: "//other.example.com/test",
    }),
    /Path cannot contain a protocol-relative URL/,
  );
});

test("HTTP client validates query and headers", async () => {
  const client = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    fetchImpl: async () => new Response("ok", { status: 200 }),
  });

  await assert.rejects(
    client.request({
      method: "GET",
      path: "/test",
      query: { limit: Number.NaN },
    }),
    /Query parameter value for limit must be finite/,
  );

  await assert.rejects(
    client.request({
      method: "GET",
      path: "/test",
      query: { limit: {} as never },
    }),
    /Invalid query parameter value for limit/,
  );

  await assert.rejects(
    client.request({
      method: "GET",
      path: "/test",
      headers: { "x-test": 123 as never },
    }),
    /Header value for x-test must be a string/,
  );
});

test("HTTP client maps request body serialization failures", async () => {
  const client = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    fetchImpl: async () => new Response("ok", { status: 200 }),
  });

  const circular: Record<string, unknown> = {};
  circular.self = circular;

  await assert.rejects(
    client.request({
      method: "POST",
      path: "/test",
      body: circular,
    }),
    (error: unknown) =>
      error instanceof ExchangeError &&
      error.code === "INVALID_REQUEST" &&
      error.message === "Request body could not be serialized as JSON",
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

test("HTTP client preserves non-JSON response bodies", async () => {
  const client = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com",
    fetchImpl: async () =>
      new Response("plain response", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
  });

  const result = await client.request<string>({
    method: "GET",
    path: "/test",
  });

  assert.equal(result.data, "plain response");
});

test("HTTP client rejects request URLs outside configured origin", async () => {
  const client = createExchangeHttpClient({
    exchange: "mexc",
    baseUrl: "https://api.example.com/base",
    fetchImpl: async () => new Response("ok", { status: 200 }),
  });

  await assert.rejects(
    client.request({
      method: "GET",
      path: "https://evil.example.com/test",
    }),
    /Path must be relative to the configured base URL/,
  );
});
