import assert from "node:assert/strict";
import test from "node:test";
import type { ExchangeWebSocketClient, ExchangeWebSocketMessage } from "../exchangeWebSocket";

interface BinanceLikeMessage extends ExchangeWebSocketMessage {
  readonly stream: string;
}

test("generic WebSocket contract supports exchange-specific messages", async () => {
  const messages: BinanceLikeMessage[] = [];
  let connected = false;
  let closed = false;

  const client: ExchangeWebSocketClient<BinanceLikeMessage> = {
    async connect() {
      connected = true;
    },
    subscribe() {},
    unsubscribe() {},
    send() {},
    onMessage(listener) {
      listener({
        stream: "btcusdt@ticker",
        channel: "ticker",
        symbol: "BTCUSDT",
        data: { price: 100 },
      });
      return () => {};
    },
    onError() {
      return () => {};
    },
    close() {
      closed = true;
    },
    isConnected() {
      return connected && !closed;
    },
  };

  await client.connect();

  client.onMessage((message) => messages.push(message));

  assert.equal(client.isConnected(), true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.stream, "btcusdt@ticker");
  assert.equal(messages[0]?.symbol, "BTCUSDT");

  client.close();

  assert.equal(client.isConnected(), false);
});
