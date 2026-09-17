import assert from "node:assert/strict";
import {
  createMexcWebSocketClient,
  type MexcWebSocketLike,
} from "../mexcWebSocket";

class FakeSocket implements MexcWebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

async function run() {
  const fake = new FakeSocket();

  const client = createMexcWebSocketClient({
    websocketFactory: () => fake,
    reconnectDelayMs: 10_000,
  });

  const messages: unknown[] = [];
  client.onMessage((message) => messages.push(message));

  const connection = client.connect();
  fake.open();
  await connection;

  assert.equal(client.isConnected(), true);

  client.subscribe([
    "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
    "spot@public.aggre.depth.v3.api.pb@100ms@BTCUSDT",
  ]);

  assert.deepEqual(JSON.parse(fake.sent[0]), {
    method: "SUBSCRIPTION",
    params: [
      "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
      "spot@public.aggre.depth.v3.api.pb@100ms@BTCUSDT",
    ],
  });

  fake.message({
    channel: "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
    symbol: "BTCUSDT",
    publicdeals: {
      dealsList: [
        {
          price: "100000",
          quantity: "0.001",
        },
      ],
    },
  });

  assert.deepEqual(messages[0], {
    channel: "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
    symbol: "BTCUSDT",
    data: {
      channel: "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
      symbol: "BTCUSDT",
      publicdeals: {
        dealsList: [
          {
            price: "100000",
            quantity: "0.001",
          },
        ],
      },
    },
  });

  client.unsubscribe([
    "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
  ]);

  assert.deepEqual(JSON.parse(fake.sent[1]), {
    method: "UNSUBSCRIPTION",
    params: [
      "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
    ],
  });

  fake.message({
    msg: "PONG",
  });

  assert.deepEqual(messages[1], {
    data: {
      msg: "PONG",
    },
  });

  client.close();
  assert.equal(client.isConnected(), false);

  console.log("M48 MEXC WebSocket verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
