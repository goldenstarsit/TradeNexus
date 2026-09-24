import { NextResponse } from "next/server";
import {
  createExchangeSymbolRulesProvider,
  isExchangeId,
  type ExchangeId,
} from "@/src/exchange";

const provider = createExchangeSymbolRulesProvider();

type CachedRules = {
  rules: Awaited<ReturnType<typeof provider.getSymbolRules>>;
  expiresAt: number;
};

const cache = new Map<string, CachedRules>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const exchange = params.get("exchange");
  const symbol = params.get("symbol")?.trim().toUpperCase();

  if (!exchange || !isExchangeId(exchange)) {
    return NextResponse.json(
      {
        error: "Unsupported exchange",
        supportedExchanges: ["binance", "mexc", "htx"],
      },
      { status: 400 },
    );
  }

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 },
    );
  }

  const key = `${exchange}:${symbol}`;
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      exchange,
      ...cached.rules,
      cached: true,
    });
  }

  try {
    const rules = await provider.getSymbolRules(
      exchange as ExchangeId,
      symbol,
    );

    cache.set(key, {
      rules,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({
      exchange,
      ...rules,
      cached: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load symbol rules",
        exchange,
        symbol,
      },
      { status: 502 },
    );
  }
}
