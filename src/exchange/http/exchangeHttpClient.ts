import { ExchangeError } from "../domain/exchangeError";

export interface HttpRequest {
  readonly method: "GET" | "POST" | "PUT" | "DELETE";
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | boolean>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly timeoutMs?: number;
}

export interface HttpResponse<T> {
  readonly status: number;
  readonly headers: Headers;
  readonly data: T;
}

export interface ExchangeHttpClient {
  request<T>(request: HttpRequest): Promise<HttpResponse<T>>;
}

export interface ExchangeHttpClientOptions {
  readonly exchange: string;
  readonly baseUrl: string;
  readonly defaultTimeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

function validateRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function validateTimeout(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite number greater than zero`);
  }

  return value;
}

function validateBaseUrl(value: unknown): string {
  const baseUrl = validateRequiredString(value, "Base URL");

  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("Base URL must be a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Base URL must use HTTP or HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("Base URL cannot contain credentials");
  }

  url.hash = "";

  return url.toString();
}

function validateMethod(value: unknown): HttpMethod {
  if (
    typeof value !== "string" ||
    !(HTTP_METHODS as readonly string[]).includes(value)
  ) {
    throw new Error(`Unsupported HTTP method: ${String(value)}`);
  }

  return value as HttpMethod;
}

function validatePath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Path cannot be empty");
  }

  const path = value.trim();

  if (path.startsWith("//")) {
    throw new Error("Path cannot contain a protocol-relative URL");
  }

  try {
    const parsed = new URL(path);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      throw new Error("Path must be relative to the configured base URL");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Path must be relative to the configured base URL") {
      throw error;
    }
  }

  return path;
}

function validateQuery(
  query: HttpRequest["query"],
): HttpRequest["query"] {
  if (query === undefined) {
    return undefined;
  }

  if (query === null || typeof query !== "object" || Array.isArray(query)) {
    throw new Error("Query must be an object");
  }

  for (const [key, value] of Object.entries(query)) {
    if (!key.trim()) {
      throw new Error("Query parameter name cannot be empty");
    }

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error(`Invalid query parameter value for ${key}`);
    }

    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`Query parameter value for ${key} must be finite`);
    }
  }

  return query;
}

function validateHeaders(
  headers: HttpRequest["headers"],
): HttpRequest["headers"] {
  if (headers === undefined) {
    return undefined;
  }

  if (headers === null || typeof headers !== "object" || Array.isArray(headers)) {
    throw new Error("Headers must be an object");
  }

  for (const [key, value] of Object.entries(headers)) {
    if (!key.trim()) {
      throw new Error("Header name cannot be empty");
    }

    if (typeof value !== "string") {
      throw new Error(`Header value for ${key} must be a string`);
    }
  }

  return headers;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: HttpRequest["query"],
): string {
  const url = new URL(
    path,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );

  const base = new URL(baseUrl);

  if (url.origin !== base.origin) {
    throw new Error("Request URL must use the configured base URL");
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }

  url.hash = "";

  return url.toString();
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getHttpErrorCode(status: number) {
  if (status === 401 || status === 403) {
    return "AUTHENTICATION_ERROR" as const;
  }

  if (status === 429) {
    return "RATE_LIMIT" as const;
  }

  if (status >= 400 && status < 500) {
    return "INVALID_REQUEST" as const;
  }

  if (status >= 500) {
    return "EXCHANGE_ERROR" as const;
  }

  return "UNKNOWN_ERROR" as const;
}

export function createExchangeHttpClient(
  options: ExchangeHttpClientOptions,
): ExchangeHttpClient {
  if (options === null || typeof options !== "object") {
    throw new Error("HTTP client options are required");
  }

  const exchange = validateRequiredString(options.exchange, "Exchange");
  const baseUrl = validateBaseUrl(options.baseUrl);

  if (options.fetchImpl !== undefined && typeof options.fetchImpl !== "function") {
    throw new Error("Fetch implementation must be a function");
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  const defaultTimeoutMs = validateTimeout(
    options.defaultTimeoutMs ?? 10_000,
    "Default timeout",
  );

  return {
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
      if (request === null || typeof request !== "object") {
        throw new Error("HTTP request is required");
      }

      const method = validateMethod(request.method);
      const path = validatePath(request.path);
      const query = validateQuery(request.query);
      const headers = validateHeaders(request.headers);

      const timeoutMs = validateTimeout(
        request.timeoutMs ?? defaultTimeoutMs,
        "Request timeout",
      );

      const url = buildUrl(baseUrl, path, query);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const requestHeaders = new Headers(headers);
        let body: string | undefined;

        if (request.body !== undefined) {
          try {
            body = JSON.stringify(request.body);
          } catch (error) {
            throw new ExchangeError(
              exchange,
              "INVALID_REQUEST",
              "Request body could not be serialized as JSON",
              error,
            );
          }

          if (!requestHeaders.has("content-type")) {
            requestHeaders.set("content-type", "application/json");
          }
        }

        let response: Response;

        try {
          response = await fetchImpl(url, {
            method,
            headers: requestHeaders,
            body,
            signal: controller.signal,
          });
        } catch (error) {
          if (controller.signal.aborted) {
            throw new ExchangeError(
              exchange,
              "TIMEOUT",
              `Request timed out after ${timeoutMs}ms`,
              error,
            );
          }

          throw new ExchangeError(
            exchange,
            "NETWORK_ERROR",
            "Exchange HTTP request failed",
            error,
          );
        }

        const data = await readResponseBody(response);

        if (!response.ok) {
          console.error("[Exchange HTTP]", {
            exchange,
            status: response.status,
            response: data,
          });

          throw new ExchangeError(
            exchange,
            getHttpErrorCode(response.status),
            `Exchange request failed with HTTP ${response.status}`,
            data,
          );
        }

        return Object.freeze({
          status: response.status,
          headers: response.headers,
          data: data as T,
        });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
