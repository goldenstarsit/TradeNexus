import { NextResponse } from "next/server";
import {
  createExchangeSymbolProvider,
  isExchangeId,
  type ExchangeId,
} from "@/src/exchange";

const symbolProvider = createExchangeSymbolProvider();

type ExchangeSymbolResponse = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketType: "spot";
};

const symbolCache = new Map<
  string,
  { symbols: readonly ExchangeSymbolResponse[]; expiresAt: number }
>();

const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  const exchange = new URL(request.url).searchParams.get("exchange");

  if (!exchange || !isExchangeId(exchange)) {
    return NextResponse.json(
      {
        error: "Unsupported exchange",
        supportedExchanges: ["binance", "mexc", "htx"],
      },
      { status: 400 },
    );
  }

  const cached = symbolCache.get(exchange);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      exchange,
      marketType: "spot",
      symbols: cached.symbols,
      count: cached.symbols.length,
      cached: true,
    });
  }

  try {
    const symbols = await symbolProvider.getSymbols(exchange as ExchangeId);

    const spotSymbols = symbols
      .filter(
        (
          symbol,
        ): symbol is typeof symbol & { marketType: "spot" } =>
          symbol.marketType === "spot",
      )
      .sort((a, b) =>
        a.exchangeSymbol.localeCompare(b.exchangeSymbol),
      )
      .map((symbol) => ({
        symbol: symbol.exchangeSymbol,
        baseAsset: symbol.baseAsset.symbol,
        quoteAsset: symbol.quoteAsset.symbol,
        marketType: symbol.marketType,
      }));

    symbolCache.set(exchange, {
      symbols: spotSymbols,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({
      exchange,
      marketType: "spot",
      symbols: spotSymbols,
      count: spotSymbols.length,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load exchange symbols";

    return NextResponse.json(
      {
        error: message,
        exchange,
      },
      { status: 502 },
    );
  }
}
