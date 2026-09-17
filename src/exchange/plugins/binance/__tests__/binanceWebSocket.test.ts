import assert from "node:assert/strict";
import { createBinanceWebSocketClient } from "../binanceWebSocket";
import type { BinanceWebSocketLike } from "../binanceWebSocket";

class FakeSocket implements BinanceWebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  send(data: string) { this.sent.push(data); }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }); }
  close() { this.readyState = 3; this.onclose?.(); }
}

async function run() {
  const fake = new FakeSocket();
  const client = createBinanceWebSocketClient({
    websocketFactory: () => fake,
    reconnectDelayMs: 10_000,
  });
  const messages: unknown[] = [];
  client.onMessage((message) => messages.push(message));
  const connection = client.connect();
  fake.open();
  await connection;
  assert.equal(client.isConnected(), true);

  client.subscribe(["btcusdt@trade", "btcusdt@depth"]);
  assert.deepEqual(JSON.parse(fake.sent[0]), {
    method: "SUBSCRIBE",
    params: ["btcusdt@trade", "btcusdt@depth"],
    id: 1,
  });

  fake.message({ stream: "btcusdt@trade", data: { e: "trade", p: "100000" } });
  assert.deepEqual(messages[0], {
    stream: "btcusdt@trade",
    data: { e: "trade", p: "100000" },
  });

  client.unsubscribe(["btcusdt@trade"]);
  assert.deepEqual(JSON.parse(fake.sent[1]), {
    method: "UNSUBSCRIBE",
    params: ["btcusdt@trade"],
    id: 2,
  });

  fake.message({ result: null, id: 99 });
  assert.deepEqual(messages[1], { data: { result: null, id: 99 } });

  client.close();
  assert.equal(client.isConnected(), false);
  console.log("M41 Binance WebSocket verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
