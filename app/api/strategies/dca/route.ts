import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { initializeDatabase } from "@/src/database/databaseInitializer";
import { getDatabase } from "@/src/database/databaseManager";
import {
  DcaStrategyRepository,
  type CreateDcaStrategyInput,
} from "@/src/database/repositories/dcaStrategyRepository";

interface DcaOrderRequest {
  amount?: unknown;
  dropPercent?: unknown;
}

interface DcaStrategyRequest {
  balanceMode?: unknown;
  exchange?: unknown;
  symbol?: unknown;
  executionMode?: unknown;
  initialOrderAmount?: unknown;
  initialOrderCurrency?: unknown;
  takeProfit?: unknown;
  stopLoss?: unknown;
  dcaOrders?: unknown;
}

function requireString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeBalanceMode(
  value: unknown,
): "live" | "test" {
  const normalized =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  if (normalized !== "live" && normalized !== "test") {
    throw new Error(
      "Balance mode must be Live or Test",
    );
  }

  return normalized;
}

function normalizeOrders(
  value: unknown,
): CreateDcaStrategyInput["orders"] {
  if (!Array.isArray(value)) {
    throw new Error("DCA orders are required");
  }

  return value.map((order, index) => {
    if (
      typeof order !== "object" ||
      order === null
    ) {
      throw new Error(
        `DCA order ${index + 1} is invalid`,
      );
    }

    const item = order as DcaOrderRequest;

    const amount = requireString(
      item.amount,
      `DCA order ${index + 1} amount`,
    );

    const dropPercent = requireString(
      item.dropPercent,
      `DCA order ${index + 1} drop percentage`,
    );

    const numericDrop =
      Number.parseFloat(dropPercent);

    if (
      !Number.isFinite(numericDrop) ||
      numericDrop < 0 ||
      numericDrop >= 100
    ) {
      throw new Error(
        `DCA order ${index + 1} drop percentage must be between 0 and 100`,
      );
    }

    return {
      position: index + 1,
      amount,
      dropPercent,
    };
  });
}

export async function GET() {
  try {
    initializeDatabase();

    const repository = new DcaStrategyRepository(
      getDatabase(),
    );

    const strategies =
      repository.findAllDcaStrategies();

    return NextResponse.json({
      strategies,
    });
  } catch (error) {
    console.error(
      "[DCA API] Failed to list strategies:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list DCA strategies",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
) {
  try {
    initializeDatabase();

    const url = new URL(request.url);
    const configIdText = url.searchParams.get("configId");
    const configId = Number(configIdText);

    if (
      !Number.isInteger(configId) ||
      configId <= 0
    ) {
      return NextResponse.json(
        { error: "Valid DCA configuration ID is required" },
        { status: 400 },
      );
    }

    const body =
      (await request.json()) as DcaStrategyRequest;

    const input: CreateDcaStrategyInput = {
      strategyId: `unused-${configId}`,
      name: "DCA Strategy",
      balanceMode: normalizeBalanceMode(
        body.balanceMode,
      ),
      balanceAccountId: "default",
      exchangeId: requireString(
        body.exchange,
        "Exchange",
      ),
      marketType: "spot",
      symbol: requireString(
        body.symbol,
        "Symbol",
      ),
      executionMode: requireString(
        body.executionMode,
        "Execution mode",
      ),
      initialOrderAmount: requireString(
        body.initialOrderAmount,
        "Initial order amount",
      ),
      initialOrderCurrency:
        typeof body.initialOrderCurrency === "string" &&
        body.initialOrderCurrency.trim()
          ? body.initialOrderCurrency.trim().toUpperCase()
          : "USDT",
      takeProfitPercent: requireString(
        body.takeProfit,
        "Take profit",
      ),
      stopLossPercent: requireString(
        body.stopLoss,
        "Stop loss",
      ),
      orders: normalizeOrders(body.dcaOrders),
    };

    const repository =
      new DcaStrategyRepository(getDatabase());

    const existing =
      repository.findByConfigId(configId);

    const strategy = repository.updateByConfigId(
      configId,
      {
        ...input,
        strategyId: existing.config.strategy_id,
        name: existing.config.name,
        status: existing.config.status,
      },
    );

    return NextResponse.json({
      strategy,
    });
  } catch (error) {
    console.error(
      "[DCA API] Failed to update strategy:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update DCA strategy",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    initializeDatabase();

    const url = new URL(request.url);
    const configIdText = url.searchParams.get("configId");
    const configId = Number(configIdText);

    if (
      !Number.isInteger(configId) ||
      configId <= 0
    ) {
      return NextResponse.json(
        { error: "Valid DCA configuration ID is required" },
        { status: 400 },
      );
    }

    const repository =
      new DcaStrategyRepository(getDatabase());

    repository.deleteByConfigId(configId);

    return NextResponse.json({
      success: true,
      configId,
    });
  } catch (error) {
    console.error(
      "[DCA API] Failed to delete strategy:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete DCA strategy",
      },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    initializeDatabase();

    const body =
      (await request.json()) as DcaStrategyRequest;

    const input: CreateDcaStrategyInput = {
      strategyId: `dca-${randomUUID()}`,
      name: "DCA Strategy",
      balanceMode: normalizeBalanceMode(
        body.balanceMode,
      ),
      balanceAccountId: "default",
      exchangeId: requireString(
        body.exchange,
        "Exchange",
      ),
      marketType: "spot",
      symbol: requireString(
        body.symbol,
        "Symbol",
      ),
      executionMode: requireString(
        body.executionMode,
        "Execution mode",
      ),
      initialOrderAmount: requireString(
        body.initialOrderAmount,
        "Initial order amount",
      ),
      initialOrderCurrency:
        typeof body.initialOrderCurrency ===
          "string" &&
        body.initialOrderCurrency.trim()
          ? body.initialOrderCurrency
              .trim()
              .toUpperCase()
          : "USDT",
      takeProfitPercent: requireString(
        body.takeProfit,
        "Take profit",
      ),
      stopLossPercent: requireString(
        body.stopLoss,
        "Stop loss",
      ),
      orders: normalizeOrders(
        body.dcaOrders,
      ),
    };

    const repository =
      new DcaStrategyRepository(
        getDatabase(),
      );

    const strategy =
      repository.createStrategy(input);

    return NextResponse.json(
      {
        strategy,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[DCA API] Failed to save strategy:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save DCA strategy",
      },
      { status: 400 },
    );
  }
}
