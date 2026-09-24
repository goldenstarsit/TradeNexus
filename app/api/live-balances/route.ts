import { NextResponse } from "next/server";
import {
  createExchangeConfig,
  createExchangeHttpClient,
  createLiveExchangeAccountProvider,
  isExchangeId,
  type BalanceSnapshot,
  type ExchangeId,
} from "@/src/exchange";
import { createBinanceMarketDataClient } from "@/src/exchange/plugins/binance/binanceMarketData";
import { createMexcMarketDataClient } from "@/src/exchange/plugins/mexc/mexcMarketData";
import { createHtxMarketDataClient } from "@/src/exchange/plugins/htx/htxMarketData";
import type { TradingSymbol } from "@/src/exchange/domain/symbol";

const accountProvider = createLiveExchangeAccountProvider();

function createMarketDataClient(exchangeId: ExchangeId) {
  const config = createExchangeConfig(exchangeId);

  const httpClient = createExchangeHttpClient({
    exchange: config.id,
    baseUrl: config.baseUrl,
    defaultTimeoutMs: 30_000,
  });

  switch (exchangeId) {
    case "binance":
      return createBinanceMarketDataClient(httpClient);
    case "mexc":
      return createMexcMarketDataClient(httpClient);
    case "htx":
      return createHtxMarketDataClient(httpClient);
  }
}

async function addUsdtValues(
  exchange: ExchangeId,
  snapshot: BalanceSnapshot,
) {
  const balances = snapshot.balances.map((balance) => ({
    ...balance,
    total: balance.free + balance.locked,
    usdtValue: 0,
  }));

  let symbols: readonly TradingSymbol[] = [];

  try {
    const marketData = createMarketDataClient(exchange);
    symbols = await marketData.getSymbols();
  } catch (error) {
    console.error("[LiveBalances] Symbol loading failed", {
      exchange,
      error: error instanceof Error ? error.message : String(error),
    });

    return balances.map((balance) => {
      if (balance.asset.toUpperCase() === "USDT") {
        return {
          ...balance,
          usdtValue: balance.total,
        };
      }

      return balance;
    });
  }

  const marketData = createMarketDataClient(exchange);

  return Promise.all(
    balances.map(async (balance) => {
      if (balance.asset.toUpperCase() === "USDT") {
        return {
          ...balance,
          usdtValue: balance.total,
        };
      }

      const marketSymbol = symbols.find(
        (symbol: TradingSymbol) =>
          symbol.marketType === "spot" &&
          symbol.baseAsset.symbol.toUpperCase() ===
            balance.asset.toUpperCase() &&
          symbol.quoteAsset.symbol.toUpperCase() === "USDT",
      );

      if (!marketSymbol) {
        return balance;
      }

      try {
        const ticker = await marketData.getTicker(
          marketSymbol.exchangeSymbol,
        );

        return {
          ...balance,
          usdtValue: balance.total * ticker.lastPrice,
        };
      } catch (error) {
        console.error("[LiveBalances] Asset valuation failed", {
          exchange,
          asset: balance.asset,
          symbol: marketSymbol.exchangeSymbol,
          error: error instanceof Error ? error.message : String(error),
        });

        return balance;
      }
    }),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exchange = url.searchParams.get("exchange");
  const asset = url.searchParams.get("asset") ?? undefined;

  const exchangeIds: ExchangeId[] = ["binance", "mexc", "htx"];

  if (exchange && !isExchangeId(exchange)) {
    return NextResponse.json(
      {
        error: "Unsupported exchange",
        supportedExchanges: exchangeIds,
      },
      { status: 400 },
    );
  }

  try {
    if (!exchange) {
      const results = await Promise.all(
        exchangeIds.map(async (exchangeId) => {
          try {
            const snapshot = await accountProvider.getBalances(
              exchangeId,
              asset,
            );

            const balances = await addUsdtValues(
              exchangeId,
              snapshot,
            );

            return {
              exchange: exchangeId,
              balances,
              timestamp: snapshot.timestamp,
              error: undefined,
            };
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to load live exchange balance";

            console.error("[LiveBalances]", {
              exchange: exchangeId,
              error: message,
              cause:
                error instanceof Error && "cause" in error
                  ? String(error.cause)
                  : undefined,
            });

            return {
              exchange: exchangeId,
              balances: [],
              timestamp: Date.now(),
              error: message,
            };
          }
        }),
      );

      return NextResponse.json({
        balances: Object.fromEntries(
          results.map((result) => [
            result.exchange,
            result.balances,
          ]),
        ),
        timestamps: Object.fromEntries(
          results.map((result) => [
            result.exchange,
            result.timestamp,
          ]),
        ),
        errors: Object.fromEntries(
          results
            .filter((result) => result.error)
            .map((result) => [
              result.exchange,
              result.error,
            ]),
        ),
      });
    }

    const exchangeId = exchange as ExchangeId;

    const snapshot = await accountProvider.getBalances(
      exchangeId,
      asset,
    );

    const balances = await addUsdtValues(
      exchangeId,
      snapshot,
    );

    return NextResponse.json({
      ...snapshot,
      balances,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load live exchange balance";

    console.error("[LiveBalances]", {
      exchange,
      error: message,
      cause:
        error instanceof Error && "cause" in error
          ? String(error.cause)
          : undefined,
    });

    return NextResponse.json(
      {
        error: message,
        exchange,
      },
      { status: 502 },
    );
  }
}
