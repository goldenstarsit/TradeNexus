import assert from "node:assert/strict";
import {
  createHtxWebSocketClient,
  type HtxWebSocketLike,
} from "../htxWebSocket";

class FakeSocket implements HtxWebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage:
    | ((event: { data: string | ArrayBuffer }) => void)
    | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data: unknown): void {
    this.onmessage?.({
      data: JSON.stringify(data),
    });
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

async function run(): Promise<void> {
  const fake = new FakeSocket();

  const client = createHtxWebSocketClient({
    baseUrl: "wss://test.htx/ws",
    websocketFactory: () => fake,
    reconnectDelayMs: 10_000,
  });

  const messages: unknown[] = [];

  client.onMessage((message) => {
    messages.push(message);
  });

  const connection = client.connect();
  fake.open();
  await connection;

  assert.equal(client.isConnected(), true);

  client.subscribe([
    "market.btcusdt.trade.detail",
    "market.btcusdt.depth.step0",
  ]);

  const firstSubscription = JSON.parse(fake.sent[0]) as {
    sub: string;
    id: string;
  };

  const secondSubscription = JSON.parse(fake.sent[1]) as {
    sub: string;
    id: string;
  };

  assert.equal(firstSubscription.sub, "market.btcusdt.trade.detail");
  assert.equal(secondSubscription.sub, "market.btcusdt.depth.step0");
  assert.match(firstSubscription.id, /^sub-/);
  assert.match(secondSubscription.id, /^sub-/);

  fake.message({
    ch: "market.btcusdt.trade.detail",
    ts: 1710000000000,
    data: {
      tick: {
        data: [
          {
            id: 1,
            price: 100000,
            amount: 0.001,
          },
        ],
      },
    },
  });

  assert.deepEqual(messages[0], {
    ch: "market.btcusdt.trade.detail",
    symbol: "BTCUSDT",
    data: {
      tick: {
        data: [
          {
            id: 1,
            price: 100000,
            amount: 0.001,
          },
        ],
      },
    },
    raw: {
      ch: "market.btcusdt.trade.detail",
      ts: 1710000000000,
      data: {
        tick: {
          data: [
            {
              id: 1,
              price: 100000,
              amount: 0.001,
            },
          ],
        },
      },
    },
  });

  fake.message({
    ping: 1710000000123,
  });

  assert.deepEqual(JSON.parse(fake.sent[2]), {
    pong: 1710000000123,
  });

  client.unsubscribe(["market.btcusdt.trade.detail"]);

  const unsubscribe = JSON.parse(fake.sent[3]) as {
    unsub: string;
    id: string;
  };

  assert.equal(
    unsubscribe.unsub,
    "market.btcusdt.trade.detail",
  );
  assert.match(unsubscribe.id, /^unsub-/);

  fake.message({
    status: "ok",
    id: "auth-1",
  });

  assert.deepEqual(messages[1], {
    data: {
      status: "ok",
      id: "auth-1",
    },
    raw: {
      status: "ok",
      id: "auth-1",
    },
  });

  client.close();

  assert.equal(client.isConnected(), false);

  console.log("M55 HTX WebSocket verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
