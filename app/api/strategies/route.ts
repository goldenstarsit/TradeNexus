import { NextResponse } from "next/server";

import { initializeDatabase } from "@/src/database/databaseInitializer";
import {
  getDatabase,
} from "@/src/database/databaseManager";
import {
  StrategyRepository,
  type PersistedStrategy,
  type CreatePersistedStrategyInput,
  type StrategyBalanceMode,
  type StrategyStatus,
} from "@/src/database/repositories/strategyRepository";

interface StrategyRequest {
  strategyId?: string;
  name?: string;
  balanceMode?: StrategyBalanceMode;
  balanceAccountId?: string;
  exchangeId?: string;
  marketType?: string;
  symbol?: string;
  executionMode?: string;
  configuration?: unknown;
  status?: StrategyStatus;
}

function errorResponse(error: unknown, status = 400) {
  const message =
    error instanceof Error ? error.message : "Invalid strategy request";

  return NextResponse.json({ error: message }, { status });
}

function getRepository(): StrategyRepository {
  initializeDatabase();
  return new StrategyRepository(getDatabase());
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must not be empty`);
  }

  return value.trim();
}

function requireBalanceMode(value: unknown): StrategyBalanceMode {
  if (value !== "live" && value !== "test") {
    throw new Error("Balance mode must be live or test");
  }

  return value;
}

function serializeConfiguration(value: unknown): string {
  if (value === undefined) {
    return "{}";
  }

  try {
    return JSON.stringify(value);
  } catch {
    throw new Error("Strategy configuration must be JSON serializable");
  }
}

export async function GET(request: Request) {
  try {
    const repository = getRepository();
    const url = new URL(request.url);
    const strategyId = url.searchParams.get("strategyId");

    const strategies = strategyId
      ? repository.findByStrategyId(strategyId)
      : repository.findAll<PersistedStrategy>();

    return NextResponse.json({ strategies });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StrategyRequest;

    const input: CreatePersistedStrategyInput = {
      strategyId: requireString(body.strategyId, "Strategy ID"),
      name: requireString(body.name, "Strategy name"),
      balanceMode: requireBalanceMode(body.balanceMode),
      balanceAccountId: requireString(
        body.balanceAccountId,
        "Balance account ID",
      ),
      exchangeId: requireString(body.exchangeId, "Exchange ID"),
      marketType: requireString(body.marketType, "Market type"),
      symbol: requireString(body.symbol, "Symbol"),
      executionMode: requireString(
        body.executionMode,
        "Execution mode",
      ),
      configurationJson: serializeConfiguration(body.configuration),
      status: body.status,
    };

    const strategy = getRepository().create(input);

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
