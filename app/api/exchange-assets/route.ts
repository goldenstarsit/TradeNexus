import { NextResponse } from "next/server";
import {
  createExchangeAssetProvider,
  isExchangeId,
  type ExchangeId,
} from "@/src/exchange";

const assetProvider = createExchangeAssetProvider();

const assetCache = new Map<
  string,
  { assets: readonly string[]; expiresAt: number }
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

  const cached = assetCache.get(exchange);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      exchange,
      marketType: "spot",
      assets: cached.assets,
      count: cached.assets.length,
      cached: true,
    });
  }

  try {
    const assets = await assetProvider.getAssets(exchange as ExchangeId);

    assetCache.set(exchange, {
      assets,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({
      exchange,
      marketType: "spot",
      assets,
      count: assets.length,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load exchange assets";

    return NextResponse.json(
      {
        error: message,
        exchange,
      },
      { status: 502 },
    );
  }
}
