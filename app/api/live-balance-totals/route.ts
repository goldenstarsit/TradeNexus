import { NextResponse } from "next/server";

import {
  createExchangeConfig,
  createExchangeHttpClient,
  createLiveExchangeAccountProvider,
  type BalanceSnapshot,
  type ExchangeId,
} from "@/src/exchange";
import { createBinanceMarketDataClient } from "@/src/exchange/plugins/binance/binanceMarketData";
import { createHtxMarketDataClient } from "@/src/exchange/plugins/htx/htxMarketData";
import { createMexcMarketDataClient } from "@/src/exchange/plugins/mexc/mexcMarketData";
import type { TradingSymbol } from "@/src/exchange/domain/symbol";

type ExchangeTotal = {
  exchange: ExchangeId;
  totalUsdt: number;
  timestamp: number;
};

const exchanges: readonly ExchangeId[] = ["binance", "mexc", "htx"];

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

async function calculateExchangeTotal(
  exchange: ExchangeId,
): Promise<ExchangeTotal> {
  const snapshot: BalanceSnapshot =
    await accountProvider.getBalances(exchange);

  const balances = snapshot.balances.filter(
    (balance) => balance.free + balance.locked > 0,
  );

  if (balances.length === 0) {
    return {
      exchange,
      totalUsdt: 0,
      timestamp: snapshot.timestamp,
    };
  }

  const marketData = createMarketDataClient(exchange);
  const symbols = await marketData.getSymbols();

  const values = await Promise.all(
    balances.map(async (balance) => {
      const amount = balance.free + balance.locked;

      if (balance.asset.toUpperCase() === "USDT") {
        return amount;
      }

      const marketSymbol = symbols.find(
        (symbol: TradingSymbol) =>
          symbol.marketType === "spot" &&
          symbol.baseAsset.symbol.toUpperCase() ===
            balance.asset.toUpperCase() &&
          symbol.quoteAsset.symbol.toUpperCase() === "USDT",
      );

      if (!marketSymbol) {
        return 0;
      }

      const ticker = await marketData.getTicker(
        marketSymbol.exchangeSymbol,
      );

      return amount * ticker.lastPrice;
    }),
  );

  return {
    exchange,
    totalUsdt: values.reduce((total, value) => total + value, 0),
    timestamp: snapshot.timestamp,
  };
}

export async function GET() {
  try {
    const balances = await Promise.all(
      exchanges.map((exchange) => calculateExchangeTotal(exchange)),
    );

    return NextResponse.json({
      balances,
      totalUsdt: balances.reduce(
        (total, balance) => total + balance.totalUsdt,
        0,
      ),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[LiveBalanceTotals]", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate live balance totals",
      },
      { status: 502 },
    );
  }
}
