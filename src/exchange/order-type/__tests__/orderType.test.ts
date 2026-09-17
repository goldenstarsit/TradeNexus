import assert from "node:assert/strict";
import {
  getOrderTypeDefinition,
  isOrderType,
  type OrderType,
  ORDER_TYPE_DEFINITIONS,
 } from "../index";

const types: OrderType[] = ["market", "limit", "makerOnly", "stopMarket", "stopLimit"];

for (const type of types) {
  assert.equal(isOrderType(type), true);
  assert.equal(getOrderTypeDefinition(type).type, type);
}

assert.equal(isOrderType("unknown"), false);
assert.equal(ORDER_TYPE_DEFINITIONS.market.requiresPrice, false);
assert.equal(ORDER_TYPE_DEFINITIONS.limit.requiresPrice, true);
assert.equal(ORDER_TYPE_DEFINITIONS.makerOnly.makerOnly, true);
assert.equal(ORDER_TYPE_DEFINITIONS.stopMarket.requiresStopPrice, true);
assert.equal(ORDER_TYPE_DEFINITIONS.stopLimit.requiresPrice, true);
assert.equal(ORDER_TYPE_DEFINITIONS.stopLimit.requiresStopPrice, true);

console.log("M34 order type abstraction verification: OK");
