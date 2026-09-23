import type { ExchangeId } from "../domain/exchangeId";

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "LIMIT_MAKER";

export interface EffectiveMinimumOrderRequest {
  readonly exchange: ExchangeId;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly orderType: OrderType;
}

export interface QuantityRule {
  readonly minimum: number;
  readonly maximum: number | null;
  readonly step: number;
  readonly precision: number | null;
}

export interface PriceRule {
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly step: number | null;
  readonly precision: number | null;
}

export interface QuoteAmountRule {
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly step: number | null;
  readonly precision: number | null;
  readonly appliesToMarket: boolean;
}

export interface NotionalRule {
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly appliesToMarket: boolean;
}

export interface EffectiveMinimumOrderRules {
  readonly exchange: ExchangeId;
  readonly symbol: string;
  readonly baseAsset: string;
  readonly quoteAsset: string;
  readonly quantity: QuantityRule;
  readonly marketQuantity: QuantityRule | null;
  readonly price: PriceRule;
  readonly quoteAmount: QuoteAmountRule | null;
  readonly notional: NotionalRule;
  readonly referencePrice: number;
  readonly quoteOrderQtyMarketAllowed: boolean;
}

export interface EffectiveMinimumOrderResult {
  readonly exchange: ExchangeId;
  readonly symbol: string;
  readonly baseAsset: string;
  readonly quoteAsset: string;
  readonly quantity: number;
  readonly quoteAmount: number;
  readonly referencePrice: number;
  readonly quantityStep: number;
  readonly priceStep: number | null;
  readonly constraints: {
    readonly quantityMinimum: number;
    readonly notionalMinimum: number;
    readonly quoteAmountMinimum: number;
  };
}

function assertPositive(
  value: number,
  name: string,
): void {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      `${name} must be a positive finite number`,
    );
  }
}

function roundUpToStep(
  value: number,
  step: number,
): number {
  assertPositive(value, "value");
  assertPositive(step, "step");

  const units = Math.ceil(
    value / step - 1e-12,
  );

  return units * step;
}

function roundUpToPrecision(
  value: number,
  precision: number | null,
): number {
  if (precision === null) {
    return value;
  }

  if (
    !Number.isInteger(precision) ||
    precision < 0
  ) {
    throw new Error(
      "Invalid precision",
    );
  }

  const scale = 10 ** precision;

  return (
    Math.ceil(
      value * scale - 1e-12,
    ) / scale
  );
}

function normalizeQuantity(
  value: number,
  rule: QuantityRule,
): number {
  assertPositive(
    rule.minimum,
    "quantity minimum",
  );

  assertPositive(
    rule.step,
    "quantity step",
  );

  let quantity = Math.max(
    value,
    rule.minimum,
  );

  /*
   * Step size is the quantity grid. It is measured from zero,
   * not from minQty.
   */
  quantity = roundUpToStep(
    quantity,
    rule.step,
  );

  /*
   * Precision is an additional exchange constraint. If applying
   * precision changes the value, align to the step again so the
   * final quantity satisfies both constraints.
   */
  quantity = roundUpToPrecision(
    quantity,
    rule.precision,
  );

  quantity = roundUpToStep(
    quantity,
    rule.step,
  );

  if (
    quantity < rule.minimum
  ) {
    quantity = roundUpToStep(
      rule.minimum,
      rule.step,
    );
  }

  if (
    rule.maximum !== null &&
    quantity >
      rule.maximum + Number.EPSILON
  ) {
    throw new Error(
      `Effective minimum quantity ${quantity} exceeds exchange maximum quantity ${rule.maximum}`,
    );
  }

  return quantity;
}

function normalizeQuoteAmount(
  value: number,
  rule: QuoteAmountRule | null,
): number {
  assertPositive(
    value,
    "quote amount",
  );

  if (!rule) {
    return value;
  }

  let amount = value;

  if (
    rule.minimum !== null
  ) {
    amount = Math.max(
      amount,
      rule.minimum,
    );
  }

  if (
    rule.step !== null &&
    rule.step > 0
  ) {
    amount = roundUpToStep(
      amount,
      rule.step,
    );
  }

  amount = roundUpToPrecision(
    amount,
    rule.precision,
  );

  if (
    rule.minimum !== null &&
    amount < rule.minimum
  ) {
    amount = rule.minimum;
  }

  if (
    rule.maximum !== null &&
    amount >
      rule.maximum + Number.EPSILON
  ) {
    throw new Error(
      `Effective minimum quote amount ${amount} exceeds exchange maximum quote amount ${rule.maximum}`,
    );
  }

  return amount;
}

function getApplicableQuantityRule(
  rules: EffectiveMinimumOrderRules,
  request: EffectiveMinimumOrderRequest,
): QuantityRule {
  if (
    request.orderType === "MARKET" &&
    rules.marketQuantity
  ) {
    return rules.marketQuantity;
  }

  return rules.quantity;
}

function getMinimumNotional(
  rules: EffectiveMinimumOrderRules,
  request: EffectiveMinimumOrderRequest,
): number {
  if (
    request.orderType === "MARKET" &&
    !rules.notional.appliesToMarket
  ) {
    return 0;
  }

  return (
    rules.notional.minimum ?? 0
  );
}

function getMinimumQuoteAmount(
  rules: EffectiveMinimumOrderRules,
  request: EffectiveMinimumOrderRequest,
): number {
  if (!rules.quoteAmount) {
    return 0;
  }

  if (
    request.orderType === "MARKET" &&
    !rules.quoteAmount.appliesToMarket
  ) {
    return 0;
  }

  return (
    rules.quoteAmount.minimum ?? 0
  );
}

export function calculateEffectiveMinimumOrder(
  rules: EffectiveMinimumOrderRules,
  request: EffectiveMinimumOrderRequest,
): EffectiveMinimumOrderResult {
  if (
    rules.exchange !==
    request.exchange
  ) {
    throw new Error(
      `Exchange mismatch: expected ${rules.exchange}, received ${request.exchange}`,
    );
  }

  if (
    rules.symbol.toUpperCase() !==
    request.symbol.toUpperCase()
  ) {
    throw new Error(
      `Symbol mismatch: expected ${rules.symbol}, received ${request.symbol}`,
    );
  }

  assertPositive(
    rules.referencePrice,
    "referencePrice",
  );

  if (
    request.orderType === "MARKET" &&
    request.side === "BUY" &&
    !rules.quoteOrderQtyMarketAllowed
  ) {
    throw new Error(
      `${rules.exchange} does not allow quote-amount MARKET BUY orders for ${rules.symbol}`,
    );
  }

  const quantityRule =
    getApplicableQuantityRule(
      rules,
      request,
    );

  const minimumNotional =
    getMinimumNotional(
      rules,
      request,
    );

  const minimumQuoteAmount =
    getMinimumQuoteAmount(
      rules,
      request,
    );

  /*
   * Convert every monetary minimum into a base-asset quantity.
   * The largest lower bound determines the smallest possible
   * order before exchange quantity granularity is applied.
   */
  const minimumQuantityFromNotional =
    minimumNotional > 0
      ? minimumNotional /
        rules.referencePrice
      : 0;

  const minimumQuantityFromQuote =
    minimumQuoteAmount > 0
      ? minimumQuoteAmount /
        rules.referencePrice
      : 0;

  const requiredQuantity =
    Math.max(
      quantityRule.minimum,
      minimumQuantityFromNotional,
      minimumQuantityFromQuote,
    );

  /*
   * Apply exchange quantity minimum, step and precision exactly
   * once. This produces the actual smallest valid base quantity.
   */
  const quantity =
    normalizeQuantity(
      requiredQuantity,
      quantityRule,
    );

  /*
   * The final quote value comes from the final valid quantity.
   * This is important: we do not convert the rounded quote amount
   * back into quantity, avoiding unnecessary upward inflation.
   */
  let quoteAmount =
    quantity *
    rules.referencePrice;

  /*
   * A quote-amount minimum is an independent lower-bound
   * constraint. If it is higher than the value generated by the
   * valid quantity, calculate the required quantity directly once.
   */
  if (
    minimumQuoteAmount > 0 &&
    quoteAmount + Number.EPSILON <
      minimumQuoteAmount
  ) {
    const quantityFromQuote =
      normalizeQuantity(
        minimumQuoteAmount /
          rules.referencePrice,
        quantityRule,
      );

    quoteAmount =
      quantityFromQuote *
      rules.referencePrice;
  }

  if (
    minimumNotional > 0 &&
    quoteAmount + Number.EPSILON <
      minimumNotional
  ) {
    throw new Error(
      `Effective minimum order does not satisfy minimum notional ${minimumNotional}`,
    );
  }

  if (
    minimumQuoteAmount > 0 &&
    quoteAmount + Number.EPSILON <
      minimumQuoteAmount
  ) {
    throw new Error(
      `Effective minimum order does not satisfy minimum quote amount ${minimumQuoteAmount}`,
    );
  }

  quoteAmount =
    normalizeQuoteAmount(
      quoteAmount,
      rules.quoteAmount,
    );

  /*
   * Quote normalization must never silently make the returned
   * quantity inconsistent with the returned quote amount.
   *
   * Therefore the returned quoteAmount represents the actual
   * quantity × reference price value, while the normalized quote
   * value is used only for validation against quote constraints.
   */
  const finalQuantity =
    quantity;

  const finalQuoteAmount =
    finalQuantity *
    rules.referencePrice;

  if (
    rules.notional.maximum !== null &&
    request.orderType === "MARKET" &&
    rules.notional.appliesToMarket &&
    finalQuoteAmount >
      rules.notional.maximum +
        Number.EPSILON
  ) {
    throw new Error(
      `Effective minimum order exceeds exchange maximum notional ${rules.notional.maximum}`,
    );
  }

  return {
    exchange: rules.exchange,
    symbol: rules.symbol,
    baseAsset: rules.baseAsset,
    quoteAsset: rules.quoteAsset,
    quantity: finalQuantity,
    quoteAmount: finalQuoteAmount,
    referencePrice:
      rules.referencePrice,
    quantityStep:
      quantityRule.step,
    priceStep:
      rules.price.step,
    constraints: {
      quantityMinimum:
        quantityRule.minimum,
      notionalMinimum:
        minimumNotional,
      quoteAmountMinimum:
        minimumQuoteAmount,
    },
  };
}
