import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("\n===== DCA CONFIGURATION SUBMIT =====");
    console.log("Balance Mode:", body.balanceMode);
    console.log("Exchange:", body.exchange);
    console.log("Execution Mode:", body.executionMode);
    console.log("Symbol:", body.symbol);
    console.log("Initial Order Amount:", body.initialOrderAmount, body.initialOrderCurrency ?? "USDT");
    console.log("Take Profit:", body.takeProfit ?? "undefined", "%");
    console.log("Stop Loss:", body.stopLoss ?? "undefined", "%");
    console.log("DCA:", body.dcaOrders ?? []);
    console.log("====================================\n");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DCA CONFIGURATION SUBMIT] Invalid request:", error);
    return NextResponse.json(
      { error: "Invalid configuration submit request" },
      { status: 400 },
    );
  }
}
