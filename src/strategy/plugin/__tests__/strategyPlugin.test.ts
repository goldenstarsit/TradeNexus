import assert from "node:assert/strict";
import test from "node:test";
import {
  createStrategyPluginRegistry,
  type StrategyPlugin,
} from "../index";

function createPlugin(id: string): StrategyPlugin {
  return {
    metadata: {
      id,
      name: `${id} Strategy`,
      version: "1.0.0",
    },
  };
}

test("strategy plugin registry registers and retrieves plugins", () => {
  const dca = createPlugin("dca");
  const registry = createStrategyPluginRegistry([dca]);

  assert.equal(registry.has("dca"), true);
  assert.equal(registry.get("dca"), dca);
  assert.deepEqual(registry.list(), [dca]);
});

test("strategy plugin registry rejects duplicate strategy IDs", () => {
  const registry = createStrategyPluginRegistry([createPlugin("dca")]);

  assert.throws(
    () => registry.register(createPlugin("dca")),
    /already registered/,
  );
});

test("strategy plugin registry rejects missing strategy ID", () => {
  const registry = createStrategyPluginRegistry();

  assert.throws(
    () =>
      registry.register({
        metadata: {
          id: "",
          name: "Invalid",
          version: "1.0.0",
        },
      }),
    /Strategy plugin ID cannot be empty/,
  );
});

test("strategy plugin registry rejects unknown strategy lookup", () => {
  const registry = createStrategyPluginRegistry();

  assert.throws(
    () => registry.get("dca"),
    /Strategy plugin not registered: dca/,
  );
});
