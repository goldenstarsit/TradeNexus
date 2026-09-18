export interface ExchangeWebSocketMessage {
  readonly channel?: string;
  readonly symbol?: string;
  readonly data: unknown;
  readonly raw?: unknown;
}

export type ExchangeWebSocketMessageListener<TMessage extends ExchangeWebSocketMessage> =
  (message: TMessage) => void;

export type ExchangeWebSocketErrorListener =
  (error: unknown) => void;

export interface ExchangeWebSocketClient<
  TMessage extends ExchangeWebSocketMessage = ExchangeWebSocketMessage,
> {
  connect(): Promise<void>;
  subscribe(channels: readonly string[]): void;
  unsubscribe(channels: readonly string[]): void;
  send(message: unknown): void;
  onMessage(listener: ExchangeWebSocketMessageListener<TMessage>): () => void;
  onError(listener: ExchangeWebSocketErrorListener): () => void;
  close(): void;
  isConnected(): boolean;
}
