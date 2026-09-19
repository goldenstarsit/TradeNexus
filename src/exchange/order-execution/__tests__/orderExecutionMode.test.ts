import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrderExecutionModeDefinition,
  getOrderExecutionModeDefinitions,
  isOrderExecutionMode,
} from "../orderExecutionMode";

test("supports exactly the initial three execution modes", () => {
  assert.deepEqual(getOrderExecutionModeDefinitions().map((item) => item.mode), [
    "makerOnly",
    "takerOnly",
    "hybrid",
  ]);
});

test("makerOnly never allows taker execution", () => {
  const definition = getOrderExecutionModeDefinition("makerOnly");

  assert.equal(definition.prefersMaker, true);
  assert.equal(definition.allowsMaker, true);
  assert.equal(definition.allowsTaker, false);
});

test("takerOnly never allows maker execution", () => {
  const definition = getOrderExecutionModeDefinition("takerOnly");

  assert.equal(definition.prefersMaker, false);
  assert.equal(definition.allowsMaker, false);
  assert.equal(definition.allowsTaker, true);
});

test("hybrid prefers maker and permits taker fallback", () => {
  const definition = getOrderExecutionModeDefinition("hybrid");

  assert.equal(definition.prefersMaker, true);
  assert.equal(definition.allowsMaker, true);
  assert.equal(definition.allowsTaker, true);
});

test("execution mode guard rejects unknown modes", () => {
  assert.equal(isOrderExecutionMode("makerOnly"), true);
  assert.equal(isOrderExecutionMode("takerOnly"), true);
  assert.equal(isOrderExecutionMode("hybrid"), true);
  assert.equal(isOrderExecutionMode("futureMode"), false);
});
