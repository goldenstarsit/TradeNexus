import test from "node:test";
import assert from "node:assert/strict";
import {
  createExchangeMetadata,
  type ExchangeMetadata,
} from "../exchangeMetadata";

test("exchange metadata factory normalizes and freezes metadata", () => {
  const metadata = createExchangeMetadata({
    id: "mexc",
    name: "  MEXC  ",
    status: "enabled",
    baseUrl: "https://api.mexc.com",
    marketTypes: ["spot", "futures"],
  });

  assert.equal(metadata.id, "mexc");
  assert.equal(metadata.name, "MEXC");
  assert.equal(metadata.status, "enabled");
  assert.equal(metadata.baseUrl, "https://api.mexc.com");
  assert.deepEqual(metadata.marketTypes, ["spot", "futures"]);
  assert.equal(Object.isFrozen(metadata), true);
  assert.equal(Object.isFrozen(metadata.marketTypes), true);

  const typed: ExchangeMetadata = metadata;
  assert.equal(typed.id, "mexc");
});

test("exchange metadata factory rejects invalid required strings", () => {
  assert.throws(
    () =>
      createExchangeMetadata({
        id: "mexc",
        name: "   ",
        status: "enabled",
        baseUrl: "https://api.mexc.com",
        marketTypes: ["spot"],
      }),
    /Exchange name cannot be empty/,
  );

  assert.throws(
    () =>
      createExchangeMetadata({
        id: "mexc",
        name: "MEXC",
        status: "enabled",
        baseUrl: "   ",
        marketTypes: ["spot"],
      }),
    /Base URL cannot be empty/,
  );
});

test("exchange metadata factory rejects invalid URL", () => {
  assert.throws(
    () =>
      createExchangeMetadata({
        id: "mexc",
        name: "MEXC",
        status: "enabled",
        baseUrl: "not-a-url",
        marketTypes: ["spot"],
      }),
    /Base URL must be a valid URL/,
  );
});

test("exchange metadata factory rejects empty and duplicate market types", () => {
  assert.throws(
    () =>
      createExchangeMetadata({
        id: "mexc",
        name: "MEXC",
        status: "enabled",
        baseUrl: "https://api.mexc.com",
        marketTypes: [],
      }),
    /At least one market type is required/,
  );

  assert.throws(
    () =>
      createExchangeMetadata({
        id: "mexc",
        name: "MEXC",
        status: "enabled",
        baseUrl: "https://api.mexc.com",
        marketTypes: ["spot", "spot"],
      }),
    /Duplicate market types are not allowed/,
  );
});

test("exchange metadata factory rejects unsupported exchange ID and status", () => {
  assert.throws(
    () =>
      createExchangeMetadata({
        id: "unknown" as never,
        name: "Unknown",
        status: "enabled",
        baseUrl: "https://example.com",
        marketTypes: ["spot"],
      }),
    /Unsupported exchange ID/,
  );

  assert.throws(
    () =>
      createExchangeMetadata({
        id: "mexc",
        name: "MEXC",
        status: "unknown" as never,
        baseUrl: "https://api.mexc.com",
        marketTypes: ["spot"],
      }),
    /Unsupported exchange status/,
  );
});
