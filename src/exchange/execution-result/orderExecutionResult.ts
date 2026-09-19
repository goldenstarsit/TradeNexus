import type { OrderExecutionMode } from "../order-execution/orderExecutionMode";
import type { Fill } from "../fill/fill";
import type { OrderSide } from "../order/order";

export const EXECUTION_TYPES = ["maker", "taker"] as const;
export type ExecutionType = (typeof EXECUTION_TYPES)[number];

export const EXECUTION_RESULT_STATUSES = [
  "filled",
  "partiallyFilled",
  "failed",
] as const;
export type ExecutionResultStatus =
  (typeof EXECUTION_RESULT_STATUSES)[number];

export interface ExecutionFee {
  readonly amount: number;
  readonly asset: string;
}

export interface ExecutionAttempt {
  readonly type: ExecutionType;
  readonly status: "success" | "failed";
  readonly orderId?: string;
  readonly reason?: string;
  readonly timestamp: number;
}

export interface OrderExecutionResult {
  readonly orderId?: string;
  readonly clientOrderId?: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly executionMode: OrderExecutionMode;
  readonly executionType: ExecutionType;
  readonly status: ExecutionResultStatus;
  readonly requestedQuantity: number;
  readonly executedQuantity: number;
  readonly remainingQuantity: number;
  readonly averagePrice: number;
  readonly quoteQuantity: number;
  readonly fee: readonly ExecutionFee[];
  readonly fills: readonly Fill[];
  readonly attempts: readonly ExecutionAttempt[];
  readonly reportedExecutedQuantity?: number;
  readonly takerFallbackUsed: boolean;
  readonly createdAt: number;
  readonly executedAt?: number;
  readonly updatedAt: number;
}

function requiredString(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} cannot be empty`);
  }

  return value.trim();
}

function nonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number`);
  }

  return value;
}

function positive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite number greater than zero`);
  }

  return value;
}

function timestamp(value: number, field: string): number {
  return nonNegative(value, field);
}

function normalizeFees(
  fees: readonly ExecutionFee[],
): readonly ExecutionFee[] {
  return Object.freeze(
    fees.map((fee) =>
      Object.freeze({
        amount: nonNegative(fee.amount, "Fee amount"),
        asset: requiredString(fee.asset, "Fee asset").toUpperCase(),
      }),
    ),
  );
}

function normalizeFills(fills: readonly Fill[]): readonly Fill[] {
  return Object.freeze([...fills]);
}

function normalizeAttempts(
  attempts: readonly ExecutionAttempt[],
): readonly ExecutionAttempt[] {
  return Object.freeze(
    attempts.map((attempt) =>
      Object.freeze({
        type: attempt.type,
        status: attempt.status,
        ...(attempt.orderId === undefined
          ? {}
          : { orderId: requiredString(attempt.orderId, "Attempt order ID") }),
        ...(attempt.reason === undefined
          ? {}
          : { reason: requiredString(attempt.reason, "Attempt reason") }),
        timestamp: timestamp(attempt.timestamp, "Attempt timestamp"),
      }),
    ),
  );
}

export function isExecutionType(value: string): value is ExecutionType {
  return (EXECUTION_TYPES as readonly string[]).includes(value);
}

export function isExecutionResultStatus(
  value: string,
): value is ExecutionResultStatus {
  return (EXECUTION_RESULT_STATUSES as readonly string[]).includes(value);
}

export function calculateExecutionQuoteQuantity(
  fills: readonly Fill[],
): number {
  return fills.reduce((total, fill) => total + fill.quoteQuantity, 0);
}

export function calculateExecutionAveragePrice(
  fills: readonly Fill[],
): number {
  const quantity = fills.reduce((total, fill) => total + fill.quantity, 0);

  if (quantity === 0) {
    return 0;
  }

  return calculateExecutionQuoteQuantity(fills) / quantity;
}

export function calculateExecutionFees(
  fills: readonly Fill[],
): readonly ExecutionFee[] {
  const totals = new Map<string, number>();

  for (const fill of fills) {
    const asset = fill.feeAsset.toUpperCase();
    totals.set(asset, (totals.get(asset) ?? 0) + fill.fee);
  }

  return Object.freeze(
    [...totals.entries()]
      .map(([asset, amount]) =>
        Object.freeze({
          asset,
          amount,
        }),
      )
      .sort((a, b) => a.asset.localeCompare(b.asset)),
  );
}

export function createOrderExecutionResult(input: {
  readonly orderId?: string;
  readonly clientOrderId?: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly executionMode: OrderExecutionMode;
  readonly executionType: ExecutionType;
  readonly status: ExecutionResultStatus;
  readonly requestedQuantity: number;
  readonly fills: readonly Fill[];
  readonly attempts?: readonly ExecutionAttempt[];
  readonly reportedExecutedQuantity?: number;
  readonly createdAt: number;
  readonly executedAt?: number;
  readonly updatedAt: number;
}): OrderExecutionResult {
  const requestedQuantity = positive(
    input.requestedQuantity,
    "Requested quantity",
  );

  if (input.side !== "buy" && input.side !== "sell") {
    throw new Error(`Unsupported execution side: ${String(input.side)}`);
  }

  if (
    input.executionMode !== "makerOnly" &&
    input.executionMode !== "takerOnly" &&
    input.executionMode !== "hybrid"
  ) {
    throw new Error(
      `Unsupported order execution mode: ${String(input.executionMode)}`,
    );
  }

  if (!isExecutionType(input.executionType)) {
    throw new Error(
      `Unsupported execution type: ${String(input.executionType)}`,
    );
  }

  if (!isExecutionResultStatus(input.status)) {
    throw new Error(
      `Unsupported execution result status: ${String(input.status)}`,
    );
  }

  if (
    input.executionMode === "makerOnly" &&
    input.executionType !== "maker"
  ) {
    throw new Error("makerOnly execution cannot produce a taker result");
  }

  if (
    input.executionMode === "takerOnly" &&
    input.executionType !== "taker"
  ) {
    throw new Error("takerOnly execution cannot produce a maker result");
  }

  const fills = normalizeFills(input.fills);
  const fillExecutedQuantity = fills.reduce(
    (total, fill) => total + fill.quantity,
    0,
  );

  const reportedExecutedQuantity =
    input.reportedExecutedQuantity === undefined
      ? undefined
      : nonNegative(
          input.reportedExecutedQuantity,
          "Reported executed quantity",
        );

  const executedQuantity =
    fillExecutedQuantity > 0
      ? fillExecutedQuantity
      : (reportedExecutedQuantity ?? 0);

  if (executedQuantity > requestedQuantity + 1e-12) {
    throw new Error(
      "Executed quantity cannot exceed requested execution quantity",
    );
  }

  const remainingQuantity = Number(
    Math.max(0, requestedQuantity - executedQuantity).toPrecision(15),
  );

  const attempts = normalizeAttempts(input.attempts ?? []);
  const takerFallbackUsed =
    input.executionMode === "hybrid" &&
    attempts.some(
      (attempt) => attempt.type === "taker" && attempt.status === "success",
    );

  if (input.executionMode === "makerOnly" && takerFallbackUsed) {
    throw new Error("makerOnly execution cannot use taker fallback");
  }

  if (input.executionMode === "takerOnly" && takerFallbackUsed) {
    throw new Error("takerOnly execution cannot use fallback semantics");
  }

  const result: OrderExecutionResult = {
    ...(input.orderId === undefined
      ? {}
      : { orderId: requiredString(input.orderId, "Order ID") }),
    ...(input.clientOrderId === undefined
      ? {}
      : {
          clientOrderId: requiredString(
            input.clientOrderId,
            "Client order ID",
          ),
        }),
    exchange: requiredString(input.exchange, "Exchange"),
    symbol: requiredString(input.symbol, "Symbol").toUpperCase(),
    side: input.side,
    executionMode: input.executionMode,
    executionType: input.executionType,
    status: input.status,
    requestedQuantity,
    executedQuantity,
    remainingQuantity,
    averagePrice: calculateExecutionAveragePrice(fills),
    quoteQuantity: calculateExecutionQuoteQuantity(fills),
    fee: calculateExecutionFees(fills),
    fills,
    attempts,
    ...(reportedExecutedQuantity === undefined
      ? {}
      : { reportedExecutedQuantity }),
    takerFallbackUsed,
    createdAt: timestamp(input.createdAt, "Created timestamp"),
    ...(input.executedAt === undefined
      ? {}
      : { executedAt: timestamp(input.executedAt, "Executed timestamp") }),
    updatedAt: timestamp(input.updatedAt, "Updated timestamp"),
  };

  if (result.updatedAt < result.createdAt) {
    throw new Error(
      "Updated timestamp cannot be earlier than created timestamp",
    );
  }

  if (
    result.executedAt !== undefined &&
    result.executedAt < result.createdAt
  ) {
    throw new Error(
      "Executed timestamp cannot be earlier than created timestamp",
    );
  }

  return Object.freeze(result);
}
