import assert from "node:assert/strict";
import {
  createExchangeCapabilities,
  type ExchangeCapabilities,
} from "../exchangeCapabilities";

const capabilities = createExchangeCapabilities("binance", [
  "spot",
  "limitOrders",
  "balances",
]);

assert.equal(capabilities.exchangeId, "binance");
assert.equal(capabilities.supports("spot"), true);
assert.equal(capabilities.supports("limitOrders"), true);
assert.equal(capabilities.supports("balances"), true);
assert.equal(capabilities.supports("futures"), false);

assert.equal(capabilities.supported.size, 3);
assert.equal(capabilities.supported.has("spot"), true);

const supported = [...capabilities.supported];
assert.deepEqual(supported, ["spot", "limitOrders", "balances"]);

assert.throws(
  () => {
    (capabilities as unknown as { exchangeId: string }).exchangeId = "mexc";
  },
  TypeError,
);

const typed: ExchangeCapabilities = capabilities;
assert.equal(typed.supports("spot"), true);

console.log("Exchange capabilities immutable verification: OK");
