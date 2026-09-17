import assert from "node:assert/strict";
import {
  createExchangeFailoverManager,
  type ExchangeFailoverManager,
} from "../exchangeFailoverManager";

function health(
  exchangeId: "binance" | "mexc" | "htx",
  healthy: boolean,
) {
  return {
    exchangeId,
    status: healthy ? "enabled" as const : "unavailable" as const,
    healthy,
    consecutiveFailures: healthy ? 0 : 3,
  };
}

function createManager(): ExchangeFailoverManager {
  return createExchangeFailoverManager({
    exchanges: ["binance", "mexc", "htx"],
  });
}

async function run(): Promise<void> {
  const manager = createManager();

  assert.deepEqual(manager.getConfiguredExchanges(), [
    "binance",
    "mexc",
    "htx",
  ]);
  assert.equal(manager.getActiveExchange(), "binance");

  assert.equal(
    manager.updateHealth(health("binance", false)),
    "mexc",
  );
  assert.equal(manager.getActiveExchange(), "mexc");

  assert.equal(
    manager.updateHealth(health("mexc", false)),
    "htx",
  );
  assert.equal(manager.getActiveExchange(), "htx");

  assert.equal(manager.getActiveExchange(), "htx");

  assert.equal(manager.recover("binance"), "binance");
  assert.equal(manager.getActiveExchange(), "binance");

  assert.equal(
    manager.updateHealth(health("binance", false)),
    "htx",
  );

  assert.equal(manager.recover("mexc"), "htx");

  assert.equal(manager.recover("binance"), "binance");
  assert.equal(manager.getActiveExchange(), "binance");

  manager.updateHealth(health("binance", false));
  manager.updateHealth(health("mexc", false));

  assert.throws(
    () =>
      manager.updateHealth(
        health("htx", false),
      ),
    /No healthy exchange available for failover/,
  );

  const single = createExchangeFailoverManager({
    exchanges: ["binance"],
  });

  assert.throws(
    () => single.updateHealth(health("binance", false)),
    /No healthy exchange available for failover/,
  );

  assert.throws(
    () =>
      createExchangeFailoverManager({
        exchanges: [],
      }),
    /At least one exchange is required for failover/,
  );

  assert.throws(
    () =>
      manager.recover("kraken" as never),
    /Exchange not configured for failover: kraken/,
  );

  console.log("M62 Exchange Failover & Recovery verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
