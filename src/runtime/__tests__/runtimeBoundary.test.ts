import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("strategy module has no dependency on runtime or balance", () => {
  const files = [
    "src/strategy/index.ts",
    "src/strategy/strategyConfiguration.ts",
    "src/strategy/plugin/strategyPlugin.ts",
    "src/strategy/plugin/strategyPluginRegistry.ts",
    "src/strategy/dca/dcaStrategyPlugin.ts",
    "src/strategy/dca/index.ts",
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /(?:balance|runtime)/i);
  }
});

test("runtime composition is the integration boundary", () => {
  const source = readFileSync("src/runtime/runtimeComposition.ts", "utf8");

  assert.match(source, /@\/src\/balance/);
  assert.match(source, /@\/src\/strategy/);
});
