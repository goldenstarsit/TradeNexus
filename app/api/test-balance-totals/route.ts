import { NextResponse } from "next/server";

import {
  createExchangeConfig,
  createExchangeHttpClient,
  type ExchangeId,
} from "@/src/exchange";
import { createBinanceMarketDataClient } from "@/src/exchange/plugins/binance/binanceMarketData";
import { createMexcMarketDataClient } from "@/src/exchange/plugins/mexc/mexcMarketData";
import { createHtxMarketDataClient } from "@/src/exchange/plugins/htx/htxMarketData";
import type { TradingSymbol } from "@/src/exchange/domain/symbol";
import { TestBalanceRepository } from "@/src/database/repositories/testBalanceRepository";
import { getDatabase } from "@/src/database/databaseManager";
import { initializeDatabase } from "@/src/database/databaseInitializer";

type TestAssetBalance = {
  asset: string;
  available: number;
  reserved: number;
  total: number;
  usdtValue: number;
};

type TestExchangeTotal = {
  exchange: ExchangeId;
  totalUsdt: number;
  balances: TestAssetBalance[];
};

const exchanges: readonly ExchangeId[] = [
  "binance",
  "mexc",
  "htx",
];

const accountIdFor = (exchange: ExchangeId) =>
  `${exchange}:dashboard-test`;

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

async function calculateExchangeTestBalance(
  exchange: ExchangeId,
  repository: TestBalanceRepository,
): Promise<TestExchangeTotal> {
  const persistedBalances = repository.findByAccount(
    accountIdFor(exchange),
  );

  const balances = persistedBalances
    .map((balance) => ({
      asset: balance.asset.toUpperCase(),
      available: balance.available,
      reserved: balance.reserved,
      total: balance.available + balance.reserved,
      usdtValue: 0,
    }))
    .filter((balance) => balance.total > 0);

  if (balances.length === 0) {
    return {
      exchange,
      totalUsdt: 0,
      balances: [],
    };
  }

  const marketData = createMarketDataClient(exchange);
  let symbols: readonly TradingSymbol[] = [];

  try {
    symbols = await marketData.getSymbols();
  } catch (error) {
    console.error("[TestBalanceTotals] Symbol loading failed", {
      exchange,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const valuedBalances = await Promise.all(
    balances.map(async (balance) => {
      if (balance.asset === "USDT") {
        return {
          ...balance,
          usdtValue: balance.total,
        };
      }

      const marketSymbol = symbols.find(
        (symbol: TradingSymbol) =>
          symbol.marketType === "spot" &&
          symbol.baseAsset.symbol.toUpperCase() === balance.asset &&
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
        console.error("[TestBalanceTotals] Asset valuation failed", {
          exchange,
          asset: balance.asset,
          symbol: marketSymbol.exchangeSymbol,
          error:
            error instanceof Error ? error.message : String(error),
        });

        return balance;
      }
    }),
  );

  return {
    exchange,
    totalUsdt: valuedBalances.reduce(
      (total, balance) => total + balance.usdtValue,
      0,
    ),
    balances: valuedBalances,
  };
}

export async function GET() {
  try {
    initializeDatabase();

    const repository = new TestBalanceRepository(getDatabase());

    const balances = await Promise.all(
      exchanges.map((exchange) =>
        calculateExchangeTestBalance(exchange, repository),
      ),
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
    console.error("[TestBalanceTotals]", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate test balance totals",
      },
      { status: 500 },
    );
  }
}
