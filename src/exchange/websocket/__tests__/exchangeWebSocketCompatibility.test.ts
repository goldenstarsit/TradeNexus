import assert from "node:assert/strict";
import test from "node:test";
import type { ExchangeWebSocketClient } from "../exchangeWebSocket";
import type {
  BinanceWebSocketClient,
  BinanceWebSocketMessage,
} from "../../plugins/binance/binanceWebSocket";
import type {
  MexcWebSocketClient,
  MexcWebSocketMessage,
} from "../../plugins/mexc/mexcWebSocket";
import type {
  HtxWebSocketClient,
  HtxWebSocketMessage,
} from "../../plugins/htx/htxWebSocket";

type BinanceContract = ExchangeWebSocketClient<BinanceWebSocketMessage>;
type MexcContract = ExchangeWebSocketClient<MexcWebSocketMessage>;
type HtxContract = ExchangeWebSocketClient<HtxWebSocketMessage>;

const asBinanceContract = (
  client: BinanceWebSocketClient,
): BinanceContract => client;

const asMexcContract = (
  client: MexcWebSocketClient,
): MexcContract => client;

const asHtxContract = (
  client: HtxWebSocketClient,
): HtxContract => client;

test("Binance WebSocket client satisfies common contract", () => {
  assert.equal(typeof asBinanceContract, "function");
});

test("MEXC WebSocket client satisfies common contract", () => {
  assert.equal(typeof asMexcContract, "function");
});

test("HTX WebSocket client satisfies common contract", () => {
  assert.equal(typeof asHtxContract, "function");
});
