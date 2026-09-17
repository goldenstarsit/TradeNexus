import assert from "node:assert/strict";
import {
  createExchangeHealthMonitor,
  type ExchangeHealthProbe,
} from "../exchangeHealthMonitor";

async function run(): Promise<void> {
  let timestamp = 1000;

  const monitor = createExchangeHealthMonitor(
    ["binance", "mexc", "htx"],
    {
      failureThreshold: 2,
      now: () => timestamp,
    },
  );

  assert.equal(monitor.has("binance"), true);
  assert.equal(monitor.has("mexc"), true);
  assert.equal(monitor.has("htx"), true);
  assert.equal(monitor.get("binance").status, "disabled");

  timestamp = 1100;
  const binance = monitor.recordSuccess("binance", 42);

  assert.equal(binance.status, "enabled");
  assert.equal(binance.healthy, true);
  assert.equal(binance.latencyMs, 42);
  assert.equal(binance.consecutiveFailures, 0);
  assert.equal(binance.lastSuccessfulAt, 1100);

  timestamp = 1200;
  const firstFailure = monitor.recordFailure(
    "binance",
    "temporary network error",
  );

  assert.equal(firstFailure.status, "degraded");
  assert.equal(firstFailure.healthy, false);
  assert.equal(firstFailure.consecutiveFailures, 1);
  assert.equal(firstFailure.lastError, "temporary network error");
  assert.equal(firstFailure.lastSuccessfulAt, 1100);

  timestamp = 1300;
  const secondFailure = monitor.recordFailure(
    "binance",
    "connection refused",
  );

  assert.equal(secondFailure.status, "unavailable");
  assert.equal(secondFailure.consecutiveFailures, 2);
  assert.equal(secondFailure.lastFailureAt, 1300);

  timestamp = 1400;
  const recovered = monitor.recordSuccess("binance", 25);

  assert.equal(recovered.status, "enabled");
  assert.equal(recovered.healthy, true);
  assert.equal(recovered.consecutiveFailures, 0);
  assert.equal(recovered.lastSuccessfulAt, 1400);

  timestamp = 1500;
  const probe: ExchangeHealthProbe = async (exchangeId) => ({
    healthy: exchangeId === "mexc",
    latencyMs: exchangeId === "mexc" ? 15 : undefined,
    error: exchangeId === "mexc" ? undefined : "probe failed",
  });

  const mexc = await monitor.check("mexc", probe);
  assert.equal(mexc.status, "enabled");
  assert.equal(mexc.latencyMs, 15);

  const htx = await monitor.check("htx", probe);
  assert.equal(htx.status, "degraded");
  assert.equal(htx.lastError, "probe failed");

  timestamp = 1600;
  const all = await monitor.checkAll(async (exchangeId) => ({
    healthy: exchangeId !== "htx",
    latencyMs: 10,
    error: exchangeId === "htx" ? "htx unavailable" : undefined,
  }));

  assert.deepEqual(
    all.map((health) => health.exchangeId),
    ["binance", "mexc", "htx"],
  );
  assert.equal(all[0]?.status, "enabled");
  assert.equal(all[1]?.status, "enabled");
  assert.equal(all[2]?.status, "unavailable");

  assert.throws(
    () => monitor.get("kraken" as never),
    /Exchange health not registered: kraken/,
  );

  console.log("M61 Exchange Health Monitoring verification: OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
