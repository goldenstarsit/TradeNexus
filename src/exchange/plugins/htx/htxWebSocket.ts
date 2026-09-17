export interface HtxWebSocketLike {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export interface HtxWebSocketOptions {
  readonly baseUrl?: string;
  readonly websocketFactory?: (url: string) => HtxWebSocketLike;
  readonly reconnectDelayMs?: number;
}

export interface HtxWebSocketMessage {
  readonly ch?: string;
  readonly symbol?: string;
  readonly data: unknown;
  readonly raw: unknown;
}

export interface HtxWebSocketClient {
  connect(): Promise<void>;
  subscribe(channels: readonly string[]): void;
  unsubscribe(channels: readonly string[]): void;
  send(message: unknown): void;
  onMessage(listener: (message: HtxWebSocketMessage) => void): () => void;
  onError(listener: (error: unknown) => void): () => void;
  close(): void;
  isConnected(): boolean;
}

const OPEN = 1;

function decodeMessage(data: string | ArrayBuffer): unknown {
  if (typeof data === "string") {
    return JSON.parse(data);
  }

  const bytes = new Uint8Array(data);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

function extractSymbol(channel: string | undefined): string | undefined {
  if (!channel) return undefined;

  const match = /^market\.([^.]+)\./.exec(channel);
  return match?.[1]?.toUpperCase();
}

export function createHtxWebSocketClient(
  options: HtxWebSocketOptions = {},
): HtxWebSocketClient {
  const baseUrl = options.baseUrl ?? "wss://api.huobi.pro/ws";
  const reconnectDelayMs = options.reconnectDelayMs ?? 1_000;

  const websocketFactory =
    options.websocketFactory ??
    ((url: string) =>
      new WebSocket(url) as unknown as HtxWebSocketLike);

  const listeners = new Set<
    (message: HtxWebSocketMessage) => void
  >();

  const errorListeners = new Set<(error: unknown) => void>();

  let socket: HtxWebSocketLike | null = null;
  let connecting: Promise<void> | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function emitError(error: unknown): void {
    for (const listener of errorListeners) {
      listener(error);
    }
  }

  function attach(next: HtxWebSocketLike): void {
    socket = next;

    next.onopen = () => {
      if (closed) return;
    };

    next.onmessage = (event) => {
      try {
        const parsed = decodeMessage(event.data);

        if (
          parsed &&
          typeof parsed === "object" &&
          "ping" in parsed
        ) {
          const ping = parsed as { ping?: unknown };

          if (typeof ping.ping === "number") {
            send({ pong: ping.ping });
          }

          return;
        }

        if (
          parsed &&
          typeof parsed === "object" &&
          "ch" in parsed
        ) {
          const envelope = parsed as {
            ch?: unknown;
            data?: unknown;
          };

          const channel =
            typeof envelope.ch === "string"
              ? envelope.ch
              : undefined;

          const message: HtxWebSocketMessage = {
            ch: channel,
            symbol: extractSymbol(channel),
            data: envelope.data,
            raw: parsed,
          };

          for (const listener of listeners) {
            listener(message);
          }

          return;
        }

        for (const listener of listeners) {
          listener({
            data: parsed,
            raw: parsed,
          });
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
    if (closed) {
      throw new Error("HTX WebSocket client is closed");
    }

    if (socket?.readyState === OPEN) {
      return;
    }

    if (connecting) {
      return connecting;
    }

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
    if (socket?.readyState !== OPEN) {
      throw new Error("HTX WebSocket is not connected");
    }

    socket.send(JSON.stringify(message));
  }

  return {
    connect,

    subscribe(channels) {
      for (const channel of channels) {
        send({
          sub: channel,
          id: `sub-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        });
      }
    },

    unsubscribe(channels) {
      for (const channel of channels) {
        send({
          unsub: channel,
          id: `unsub-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        });
      }
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

      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
      }

      reconnectTimer = undefined;
      socket?.close();
      socket = null;
    },

    isConnected() {
      return socket?.readyState === OPEN;
    },
  };
}
