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
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? 10_000;

  return {
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
      const controller = new AbortController();
      const timeoutMs = request.timeoutMs ?? defaultTimeoutMs;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = buildUrl(options.baseUrl, request.path, request.query);
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
            throw new ExchangeError(options.exchange, "TIMEOUT", `Request timed out after ${timeoutMs}ms`, error);
          }
          throw new ExchangeError(options.exchange, "NETWORK_ERROR", "Exchange HTTP request failed", error);
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
            options.exchange,
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
