import assert from "node:assert/strict";
import {
  getOrderTypeDefinition,
  isOrderType,
  ORDER_TYPE_DEFINITIONS,
  ORDER_TYPES,
  type OrderType,
} from "../index";

const types: OrderType[] = [...ORDER_TYPES];

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

assert.equal(Object.isFrozen(ORDER_TYPE_DEFINITIONS), true);

for (const type of ORDER_TYPES) {
  assert.equal(Object.isFrozen(ORDER_TYPE_DEFINITIONS[type]), true);
}

assert.throws(
  () => {
    (ORDER_TYPE_DEFINITIONS.limit as { requiresPrice: boolean }).requiresPrice = false;
  },
  TypeError,
);

console.log("Exchange order type contract hardening verification: OK");
