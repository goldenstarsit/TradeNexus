import assert from "node:assert/strict";
import test from "node:test";
import {
  createDCAStrategyPlugin,
  DCA_STRATEGY_ID,
} from "../index";

test("DCA strategy plugin exposes stable metadata", () => {
  const plugin = createDCAStrategyPlugin();

  assert.equal(plugin.metadata.id, DCA_STRATEGY_ID);
  assert.equal(plugin.metadata.name, "Dollar Cost Averaging");
  assert.equal(plugin.metadata.version, "1.0.0");
});

test("DCA strategy plugin can be registered", () => {
  const plugin = createDCAStrategyPlugin();
  const registryModule = require("../../plugin/strategyPluginRegistry") as typeof import("../../plugin/strategyPluginRegistry");
  const registry = registryModule.createStrategyPluginRegistry([plugin]);

  assert.equal(registry.has(DCA_STRATEGY_ID), true);
  assert.equal(registry.get(DCA_STRATEGY_ID), plugin);
});
