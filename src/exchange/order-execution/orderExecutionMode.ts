export const ORDER_EXECUTION_MODES = [
  "makerOnly",
  "takerOnly",
  "hybrid",
] as const;

export type OrderExecutionMode = (typeof ORDER_EXECUTION_MODES)[number];

export interface OrderExecutionModeDefinition {
  readonly mode: OrderExecutionMode;
  readonly prefersMaker: boolean;
  readonly allowsMaker: boolean;
  readonly allowsTaker: boolean;
  readonly description: string;
}

const MODE_DEFINITIONS: Readonly<Record<OrderExecutionMode, OrderExecutionModeDefinition>> =
  Object.freeze({
    makerOnly: Object.freeze({
      mode: "makerOnly",
      prefersMaker: true,
      allowsMaker: true,
      allowsTaker: false,
      description: "Execution must be completed as maker; taker execution is not allowed.",
    }),
    takerOnly: Object.freeze({
      mode: "takerOnly",
      prefersMaker: false,
      allowsMaker: false,
      allowsTaker: true,
      description: "Execution must be completed as taker.",
    }),
    hybrid: Object.freeze({
      mode: "hybrid",
      prefersMaker: true,
      allowsMaker: true,
      allowsTaker: true,
      description:
        "Prefer maker execution; taker execution is allowed only after maker execution cannot be achieved.",
    }),
  });

export function isOrderExecutionMode(
  value: string,
): value is OrderExecutionMode {
  return (ORDER_EXECUTION_MODES as readonly string[]).includes(value);
}

export function getOrderExecutionModeDefinition(
  mode: OrderExecutionMode,
): OrderExecutionModeDefinition {
  if (!isOrderExecutionMode(mode)) {
    throw new Error(`Unsupported order execution mode: ${String(mode)}`);
  }

  return MODE_DEFINITIONS[mode];
}

export function getOrderExecutionModeDefinitions(): readonly OrderExecutionModeDefinition[] {
  return Object.freeze(
    ORDER_EXECUTION_MODES.map((mode) => MODE_DEFINITIONS[mode]),
  );
}
