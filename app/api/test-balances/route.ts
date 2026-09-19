import { NextResponse } from "next/server";

import {
  depositTestBalance,
  getTestBalance,
  withdrawTestBalance,
} from "@/src/strategy/testBalance/testBalanceService";

interface BalanceRequest {
  accountId?: string;
  asset?: string;
  amount?: number;
  action?: "deposit" | "withdraw";
}

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Invalid balance request";
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId") ?? "";
    const asset = url.searchParams.get("asset") ?? "";

    return NextResponse.json({
      balance: getTestBalance(accountId, asset),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BalanceRequest;

    const accountId = body.accountId ?? "";
    const asset = body.asset ?? "";
    const amount = body.amount;
    const action = body.action;

    if (typeof amount !== "number") {
      throw new Error("Balance amount must be a number");
    }

    if (action === "deposit") {
      return NextResponse.json({
        balance: depositTestBalance(accountId, asset, amount),
      });
    }

    if (action === "withdraw") {
      return NextResponse.json({
        balance: withdrawTestBalance(accountId, asset, amount),
      });
    }

    throw new Error("Balance action must be deposit or withdraw");
  } catch (error) {
    return errorResponse(error);
  }
}
