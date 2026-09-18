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

function validateRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function validateTimeout(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite number greater than zero`);
  }

  return value;
}

function validateBaseUrl(value: string): string {
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

  return url.toString();
}

function buildUrl(baseUrl: string, path: string, query?: HttpRequest["query"]): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
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

export function createExchangeHttpClient(
  options: ExchangeHttpClientOptions,
): ExchangeHttpClient {
  const exchange = validateRequiredString(options.exchange, "Exchange");
  const baseUrl = validateBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultTimeoutMs = validateTimeout(
    options.defaultTimeoutMs ?? 10_000,
    "Default timeout",
  );

  return {
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
      const controller = new AbortController();
      const timeoutMs = validateTimeout(
        request.timeoutMs ?? defaultTimeoutMs,
        "Request timeout",
      );
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = buildUrl(baseUrl, request.path, request.query);
        const headers = new Headers(request.headers);
        let body: string | undefined;

        if (request.body !== undefined) {
          body = JSON.stringify(request.body);
          if (!headers.has("content-type")) headers.set("content-type", "application/json");
        }

        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: request.method,
            headers,
            body,
            signal: controller.signal,
          });
        } catch (error) {
          if (controller.signal.aborted) {
            throw new ExchangeError(exchange, "TIMEOUT", `Request timed out after ${timeoutMs}ms`, error);
          }
          throw new ExchangeError(exchange, "NETWORK_ERROR", "Exchange HTTP request failed", error);
        }

        const data = await readResponseBody(response);

        if (!response.ok) {
          const code = response.status === 401 || response.status === 403
            ? "AUTHENTICATION_ERROR"
            : response.status === 429
              ? "RATE_LIMIT"
              : response.status >= 400 && response.status < 500
                ? "INVALID_REQUEST"
                : response.status >= 500
                  ? "EXCHANGE_ERROR"
                  : "UNKNOWN_ERROR";

          throw new ExchangeError(
            exchange,
            code,
            `Exchange request failed with HTTP ${response.status}`,
            data,
          );
        }

        return {
          status: response.status,
          headers: response.headers,
          data: data as T,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
