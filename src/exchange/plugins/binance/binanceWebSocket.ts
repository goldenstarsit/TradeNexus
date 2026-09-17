export interface BinanceWebSocketLike {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export interface BinanceWebSocketOptions {
  readonly baseUrl?: string;
  readonly websocketFactory?: (url: string) => BinanceWebSocketLike;
  readonly reconnectDelayMs?: number;
  readonly now?: () => number;
}

export interface BinanceWebSocketMessage {
  readonly stream?: string;
  readonly data: unknown;
}

export interface BinanceWebSocketClient {
  connect(): Promise<void>;
  subscribe(streams: readonly string[]): void;
  unsubscribe(streams: readonly string[]): void;
  send(message: unknown): void;
  onMessage(listener: (message: BinanceWebSocketMessage) => void): () => void;
  onError(listener: (error: unknown) => void): () => void;
  close(): void;
  isConnected(): boolean;
}

const OPEN = 1;

export function createBinanceWebSocketClient(
  options: BinanceWebSocketOptions = {},
): BinanceWebSocketClient {
  const configuredBaseUrl = options.baseUrl ?? "wss://stream.binance.com:9443/ws";
  const baseUrl = configuredBaseUrl.endsWith("/") ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl;
  const reconnectDelayMs = options.reconnectDelayMs ?? 1_000;
  const websocketFactory = options.websocketFactory ?? ((url: string) => new WebSocket(url) as unknown as BinanceWebSocketLike);
  const listeners = new Set<(message: BinanceWebSocketMessage) => void>();
  const errorListeners = new Set<(error: unknown) => void>();
  let socket: BinanceWebSocketLike | null = null;
  let connecting: Promise<void> | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;

  function emitError(error: unknown): void {
    for (const listener of errorListeners) listener(error);
  }

  function attach(next: BinanceWebSocketLike): void {
    socket = next;
    next.onopen = () => {
      if (closed) return;
    };
    next.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as unknown;
        if (parsed && typeof parsed === "object" && "stream" in parsed && "data" in parsed) {
          const envelope = parsed as { stream?: unknown; data?: unknown };
          for (const listener of listeners) listener({ stream: typeof envelope.stream === "string" ? envelope.stream : undefined, data: envelope.data });
        } else {
          for (const listener of listeners) listener({ data: parsed });
        }
      } catch (error) {
        emitError(error);
      }
    };
    next.onerror = emitError;
    next.onclose = () => {
      socket = null;
      if (!closed && reconnectTimer === undefined) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined;
          void connect().catch(emitError);
        }, reconnectDelayMs);
      }
    };
  }

  async function connect(): Promise<void> {
    if (closed) throw new Error("Binance WebSocket client is closed");
    if (socket?.readyState === OPEN) return;
    if (connecting) return connecting;
    connecting = new Promise<void>((resolve, reject) => {
      try {
        const next = websocketFactory(baseUrl);
        attach(next);
        if (next.readyState === OPEN) {
          resolve();
          return;
        }
        const previousOpen = next.onopen;
        const previousError = next.onerror;
        next.onopen = () => {
          previousOpen?.();
          resolve();
        };
        next.onerror = (error) => {
          previousError?.(error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    }).finally(() => {
      connecting = null;
    });
    return connecting;
  }

  function send(message: unknown): void {
    if (socket?.readyState !== OPEN) throw new Error("Binance WebSocket is not connected");
    socket.send(JSON.stringify(message));
  }

  return {
    connect,
    subscribe(streams) {
      if (streams.length === 0) return;
      send({ method: "SUBSCRIBE", params: streams.map((stream) => stream.toLowerCase()), id: ++requestId });
    },
    unsubscribe(streams) {
      if (streams.length === 0) return;
      send({ method: "UNSUBSCRIBE", params: streams.map((stream) => stream.toLowerCase()), id: ++requestId });
    },
    send,
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    close() {
      closed = true;
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      socket?.close();
      socket = null;
    },
    isConnected() {
      return socket?.readyState === OPEN;
    },
  };
}
