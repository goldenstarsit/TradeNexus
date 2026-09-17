export interface MexcWebSocketLike {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export interface MexcWebSocketOptions {
  readonly baseUrl?: string;
  readonly websocketFactory?: (url: string) => MexcWebSocketLike;
  readonly reconnectDelayMs?: number;
}

export interface MexcWebSocketMessage {
  readonly channel?: string;
  readonly symbol?: string;
  readonly data: unknown;
}

export interface MexcWebSocketClient {
  connect(): Promise<void>;
  subscribe(streams: readonly string[]): void;
  unsubscribe(streams: readonly string[]): void;
  send(message: unknown): void;
  onMessage(listener: (message: MexcWebSocketMessage) => void): () => void;
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

export function createMexcWebSocketClient(
  options: MexcWebSocketOptions = {},
): MexcWebSocketClient {
  const baseUrl = options.baseUrl ?? "ws://wbs-api.mexc.com/ws";
  const reconnectDelayMs = options.reconnectDelayMs ?? 1_000;
  const websocketFactory =
    options.websocketFactory ??
    ((url: string) => new WebSocket(url) as unknown as MexcWebSocketLike);

  const listeners = new Set<(message: MexcWebSocketMessage) => void>();
  const errorListeners = new Set<(error: unknown) => void>();

  let socket: MexcWebSocketLike | null = null;
  let connecting: Promise<void> | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function emitError(error: unknown): void {
    for (const listener of errorListeners) {
      listener(error);
    }
  }

  function attach(next: MexcWebSocketLike): void {
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
          "channel" in parsed
        ) {
          const envelope = parsed as {
            channel?: unknown;
            symbol?: unknown;
            [key: string]: unknown;
          };

          for (const listener of listeners) {
            listener({
              channel:
                typeof envelope.channel === "string"
                  ? envelope.channel
                  : undefined,
              symbol:
                typeof envelope.symbol === "string"
                  ? envelope.symbol
                  : undefined,
              data: parsed,
            });
          }

          return;
        }

        for (const listener of listeners) {
          listener({ data: parsed });
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
      throw new Error("MEXC WebSocket client is closed");
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
      throw new Error("MEXC WebSocket is not connected");
    }

    socket.send(JSON.stringify(message));
  }

  return {
    connect,

    subscribe(streams) {
      if (streams.length === 0) return;

      send({
        method: "SUBSCRIPTION",
        params: [...streams],
      });
    },

    unsubscribe(streams) {
      if (streams.length === 0) return;

      send({
        method: "UNSUBSCRIPTION",
        params: [...streams],
      });
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
