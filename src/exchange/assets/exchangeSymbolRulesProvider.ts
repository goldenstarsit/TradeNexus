import { createExchangeHttpClient } from "../http";
import { createExchangeConfig } from "../config";
import type { ExchangeId } from "../domain/exchangeId";
import {
  calculateEffectiveMinimumOrder,
  type EffectiveMinimumOrderRules,
} from "../orders/effectiveMinimumOrder";

export interface ExchangeSymbolRules {
  readonly symbol: string;
  readonly quoteAsset: string;
  readonly minimumOrderAmount: number;
  readonly minimumOrderAmountCurrency: string;
  readonly quantityMinimum: number;
  readonly minQty: string;
  readonly quantityStep: number;
  readonly priceStep: number | null;
  readonly referencePrice: number;
}

interface MEXCSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision?: number;
  quotePrecision?: number;
  quoteAssetPrecision?: number;
  quoteAmountPrecision?: string;
  quoteAmountPrecisionMarket?: string;
  baseSizePrecision?: string;
  maxQuoteAmount?: string;
  maxQuoteAmountMarket?: string;
  quoteOrderQtyMarketAllowed?: boolean;
}

interface MEXCExchangeInfoResponse {
  symbols: MEXCSymbolInfo | MEXCSymbolInfo[];
}

interface BinanceFilter {
  filterType: string;
  minNotional?: string;
  maxNotional?: string;
  minQty?: string;
  maxQty?: string;
  stepSize?: string;
  minPrice?: string;
  maxPrice?: string;
  tickSize?: string;
  applyToMarket?: boolean;
  applyMinToMarket?: boolean;
  applyMaxToMarket?: boolean;
  avgPriceMins?: number;
}

interface BinanceSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision?: number;
  quotePrecision?: number;
  quoteAssetPrecision?: number;
  filters: BinanceFilter[];
  quoteOrderQtyMarketAllowed?: boolean;
}

interface BinanceExchangeInfoResponse {
  symbols: BinanceSymbolInfo[];
}

interface HtxSymbolInfo {
  symbol: string;
  "base-currency": string;
  "quote-currency": string;
  state: string;
  "min-order-value"?: number;
  "min-order-amt"?: number;
  "limit-order-min-order-amt"?: number;
  "sell-market-min-order-amt"?: number;
  "buy-market-max-order-amt"?: number;
  "limit-order-max-order-amt"?: number;
  "amount-precision"?: number;
  "price-precision"?: number;
}

interface HtxSymbolResponse {
  status: string;
  data: HtxSymbolInfo[];
}

interface TickerResponse {
  askPrice: string;
  bidPrice: string;
  lastPrice: string;
}

interface HtxMergedTickerResponse {
  tick?: {
    ask?: readonly [string | number, string | number];
    bid?: readonly [string | number, string | number];
    close?: string | number;
  };
}

interface AvgPriceResponse {
  mins: number;
  price: string;
}

function positiveNumber(value: unknown, name: string): number {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Invalid ${name}: ${String(value)}`);
  }

  return number;
}

function optionalPositiveNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

function decimalPlaces(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const text = value.toString().toLowerCase();

  if (text.includes("e-")) {
    const [coefficient, exponentText] = text.split("e-");
    const exponent = Number(exponentText);
    const coefficientDecimals = coefficient.includes(".")
      ? coefficient.split(".")[1].length
      : 0;

    return exponent + coefficientDecimals;
  }

  if (text.includes("e+")) {
    return 0;
  }

  const decimal = text.split(".")[1];

  return decimal ? decimal.length : 0;
}

function ceilToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return value;
  }

  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }

  const precision = Math.min(
    18,
    Math.max(decimalPlaces(value), decimalPlaces(step)),
  );

  const scale = 10 ** precision;
  const scaledValue = value * scale;
  const scaledStep = step * scale;

  if (
    !Number.isFinite(scaledValue) ||
    !Number.isFinite(scaledStep) ||
    scaledStep <= 0
  ) {
    return value;
  }

  const units = Math.ceil((scaledValue - 1e-9) / scaledStep);
  const result = (units * scaledStep) / scale;

  return Number(result.toFixed(precision));
}

function ceilToDecimalPlaces(value: number, precision: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return value;
  }

  if (!Number.isFinite(precision) || precision < 0) {
    return value;
  }

  const safePrecision = Math.min(18, Math.floor(precision));
  const scale = 10 ** safePrecision;

  if (!Number.isFinite(scale)) {
    return value;
  }

  return Number(
    (Math.ceil((value * scale) - 1e-9) / scale).toFixed(safePrecision),
  );
}

function maxPositive(...values: number[]): number {
  return values.reduce(
    (maximum, value) =>
      Number.isFinite(value) && value > maximum ? value : maximum,
    0,
  );
}

async function getTickerPrice(
  httpClient: ReturnType<typeof createExchangeHttpClient>,
  path: string,
  symbol: string,
): Promise<number> {
  const response = await httpClient.request<TickerResponse>({
    method: "GET",
    path,
    query: { symbol },
  });

  return positiveNumber(
    response.data.askPrice ||
      response.data.lastPrice ||
      response.data.bidPrice,
    "ticker price",
  );
}

async function getHtxMarketReferencePrice(
  httpClient: ReturnType<typeof createExchangeHttpClient>,
  symbol: string,
): Promise<number> {
  const response =
    await httpClient.request<HtxMergedTickerResponse>({
      method: "GET",
      path: "/market/detail/merged",
      query: { symbol: symbol.toLowerCase() },
    });

  return positiveNumber(
    response.data.tick?.ask?.[0] ??
      response.data.tick?.close ??
      response.data.tick?.bid?.[0],
    "HTX ticker price",
  );
}

async function getBinanceMarketReferencePrice(
  httpClient: ReturnType<typeof createExchangeHttpClient>,
  symbol: string,
  avgPriceMins: number,
): Promise<number> {
  if (avgPriceMins > 0) {
    const response =
      await httpClient.request<AvgPriceResponse>({
        method: "GET",
        path: "/api/v3/avgPrice",
        query: { symbol: symbol },
      });

    return positiveNumber(
      response.data.price,
      "Binance average market price",
    );
  }

  return getTickerPrice(
    httpClient,
    "/api/v3/ticker/24hr",
    symbol,
  );
}

function getBinanceQuantityRules(
  filters: BinanceFilter[],
): {
  minimum: number;
  step: number;
} {
  const marketLot = getBinanceFilter(
    filters,
    "MARKET_LOT_SIZE",
  );

  const lot = getBinanceFilter(
    filters,
    "LOT_SIZE",
  );

  const marketMinimum =
    optionalPositiveNumber(marketLot?.minQty);

  const marketStep =
    optionalPositiveNumber(marketLot?.stepSize);

  const lotMinimum =
    optionalPositiveNumber(lot?.minQty);

  const lotStep =
    optionalPositiveNumber(lot?.stepSize);

  /*
   * A MARKET order must satisfy its market-specific quantity
   * filter when Binance supplies one. LOT_SIZE remains relevant
   * to quantity validation as well. We therefore use the strictest
   * applicable lower bound and the strictest positive step.
   */
  return {
    minimum: Math.max(
      marketMinimum,
      lotMinimum,
    ),
    step: Math.max(
      marketStep,
      lotStep,
    ),
  };
}

function getBinanceMinimumNotional(
  filters: BinanceFilter[],
): {
  minimum: number;
  avgPriceMins: number;
} {
  let minimum = 0;
  let avgPriceMins = 0;

  for (const filter of filters) {
    if (
      filter.filterType !== "MIN_NOTIONAL" &&
      filter.filterType !== "NOTIONAL"
    ) {
      continue;
    }

    const candidate =
      optionalPositiveNumber(filter.minNotional);

    if (candidate <= 0) {
      continue;
    }

    const appliesToMarket =
      filter.filterType === "MIN_NOTIONAL"
        ? filter.applyToMarket !== false
        : filter.applyMinToMarket !== false;

    if (!appliesToMarket) {
      continue;
    }

    if (candidate > minimum) {
      minimum = candidate;
      avgPriceMins = filter.avgPriceMins ?? 0;
    }
  }

  return {
    minimum,
    avgPriceMins,
  };
}

function getBinanceQuotePrecision(
  item: BinanceSymbolInfo,
): number {
  return Math.max(
    0,
    Math.floor(
      item.quoteAssetPrecision ??
        item.quotePrecision ??
        8,
    ),
  );
}

function getBinancePriceStep(
  filters: BinanceFilter[],
): number | null {
  const priceFilter = getBinanceFilter(
    filters,
    "PRICE_FILTER",
  );

  const step =
    optionalPositiveNumber(priceFilter?.tickSize);

  return step > 0 ? step : null;
}

function getBinanceMaxQuantity(
  filters: BinanceFilter[],
): number {
  const values = filters
    .filter(
      (filter) =>
        filter.filterType === "MARKET_LOT_SIZE" ||
        filter.filterType === "LOT_SIZE",
    )
    .map((filter) =>
      optionalPositiveNumber(filter.maxQty),
    )
    .filter((value) => value > 0);

  return values.length > 0
    ? Math.min(...values)
    : 0;
}

function getBinanceFilter(
  filters: BinanceFilter[],
  ...types: string[]
): BinanceFilter | undefined {
  return filters.find((filter) => types.includes(filter.filterType));
}

export interface ExchangeSymbolRulesProvider {
  getSymbolRules(
    exchangeId: ExchangeId,
    symbol: string,
    referencePriceOverride?: number,
  ): Promise<ExchangeSymbolRules>;

  calculateMinimumOrderAtDrop(
    exchangeId: ExchangeId,
    symbol: string,
    dropPercent: number,
  ): Promise<ExchangeSymbolRules>;
}

export function createExchangeSymbolRulesProvider(): ExchangeSymbolRulesProvider {
  return {
    async getSymbolRules(
      exchangeId,
      symbol,
      referencePriceOverride,
    ) {
      const normalizedSymbol = symbol.trim().toUpperCase();

      if (!normalizedSymbol) {
        throw new Error("Symbol cannot be empty");
      }

      const config = createExchangeConfig(exchangeId);

      const httpClient = createExchangeHttpClient({
        exchange: config.id,
        baseUrl: config.baseUrl,
        defaultTimeoutMs: 30_000,
      });

      switch (exchangeId) {
        case "mexc": {
          const response =
            await httpClient.request<MEXCExchangeInfoResponse>({
              method: "GET",
              path: "/api/v3/exchangeInfo",
              query: { symbol: normalizedSymbol },
            });

          const item = Array.isArray(response.data.symbols)
            ? response.data.symbols.find(
                (entry) =>
                  entry.symbol.toUpperCase() === normalizedSymbol,
              )
            : response.data.symbols;

          if (!item) {
            throw new Error(
              `Symbol ${normalizedSymbol} was not found on MEXC`,
            );
          }

          if (item.status && item.status.toUpperCase() !== "1") {
            throw new Error(
              `Symbol ${normalizedSymbol} is not active on MEXC`,
            );
          }

          /*
           * MEXC uses baseSizePrecision as the quantity increment.
           * quoteAmountPrecisionMarket is the minimum MARKET quote amount.
           */
          const quantityStep = positiveNumber(
            item.baseSizePrecision,
            "MEXC quantity step",
          );

          const quantityMinimum = quantityStep;

          const quotePrecision = positiveNumber(
            item.quotePrecision ??
              item.quoteAssetPrecision ??
              8,
            "MEXC quote precision",
          );

          const marketQuoteMinimum = positiveNumber(
            item.quoteAmountPrecisionMarket ??
              item.quoteAmountPrecision,
            "MEXC minimum market quote amount",
          );

          const price =
            referencePriceOverride ??
            (await getTickerPrice(
              httpClient,
              "/api/v3/ticker/24hr",
              normalizedSymbol,
            ));

          const rules: EffectiveMinimumOrderRules = {
            exchange: exchangeId,
            symbol: normalizedSymbol,
            baseAsset: item.baseAsset,
            quoteAsset: item.quoteAsset,
            quantity: {
              minimum: quantityMinimum,
              maximum: null,
              step: quantityStep,
              precision: item.baseAssetPrecision ?? null,
            },
            marketQuantity: {
              minimum: quantityMinimum,
              maximum: null,
              step: quantityStep,
              precision: item.baseAssetPrecision ?? null,
            },
            price: {
              minimum: null,
              maximum: null,
              step: null,
              precision: quotePrecision,
            },

            quoteAmount: {
              minimum: marketQuoteMinimum,
              maximum: optionalPositiveNumber(
                item.maxQuoteAmountMarket ??
                  item.maxQuoteAmount,
              ) || null,
              step: null,
              precision: quotePrecision,
              appliesToMarket: true,
            },

    notional: {
              minimum: marketQuoteMinimum,
              maximum: optionalPositiveNumber(
                item.maxQuoteAmountMarket ??
                  item.maxQuoteAmount,
              ) || null,
              appliesToMarket: true,
            },
            referencePrice: price,
            quoteOrderQtyMarketAllowed:
              item.quoteOrderQtyMarketAllowed !== false,
          };

          const minimum = calculateEffectiveMinimumOrder(
            rules,
            {
              exchange: exchangeId,
              symbol: normalizedSymbol,
              side: "BUY",
              orderType: "MARKET",
            },
          );

          return {
            symbol: normalizedSymbol,
            quoteAsset: minimum.quoteAsset,
            minimumOrderAmount: minimum.quoteAmount,
            minimumOrderAmountCurrency: minimum.quoteAsset,
            quantityMinimum: minimum.quantity,
            minQty: String(minimum.quantity),
            quantityStep: minimum.quantityStep,
            priceStep: minimum.priceStep,
            referencePrice: minimum.referencePrice,
          };
        }

        case "binance": {
          const response =
            await httpClient.request<BinanceExchangeInfoResponse>({
              method: "GET",
              path: "/api/v3/exchangeInfo",
              query: { symbol: normalizedSymbol },
            });

          const item = response.data.symbols.find(
            (entry) =>
              entry.symbol.toUpperCase() === normalizedSymbol,
          );

          if (!item) {
            throw new Error(
              `Symbol ${normalizedSymbol} was not found on Binance`,
            );
          }

          if (
            item.status &&
            item.status.toUpperCase() !== "TRADING"
          ) {
            throw new Error(
              `Symbol ${normalizedSymbol} is not active on Binance`,
            );
          }

          const quantityRules =
            getBinanceQuantityRules(item.filters);

          const marketQuantityFilter =
            getBinanceFilter(
              item.filters,
              "MARKET_LOT_SIZE",
            );

          const lotQuantityFilter =
            getBinanceFilter(
              item.filters,
              "LOT_SIZE",
            );

          const marketMinimum =
            optionalPositiveNumber(
              marketQuantityFilter?.minQty,
            );

          const marketMaximum =
            optionalPositiveNumber(
              marketQuantityFilter?.maxQty,
            );

          const lotMinimum =
            optionalPositiveNumber(
              lotQuantityFilter?.minQty,
            );

          const lotMaximum =
            optionalPositiveNumber(
              lotQuantityFilter?.maxQty,
            );

          const marketStep =
            optionalPositiveNumber(
              marketQuantityFilter?.stepSize,
            );

          const lotStep =
            optionalPositiveNumber(
              lotQuantityFilter?.stepSize,
            );

          const quantityMinimum = Math.max(
            marketMinimum,
            lotMinimum,
            quantityRules.minimum,
          );

          const quantityStep =
            Math.max(
              marketStep,
              lotStep,
              quantityRules.step,
            ) || quantityMinimum;

          const quantityMaximumValues = [
            marketMaximum,
            lotMaximum,
            getBinanceMaxQuantity(item.filters),
          ].filter((value) => value > 0);

          const quantityMaximum =
            quantityMaximumValues.length > 0
              ? Math.min(...quantityMaximumValues)
              : null;

          const {
            minimum: minimumNotional,
            avgPriceMins,
          } = getBinanceMinimumNotional(item.filters);

          const referencePrice =
            referencePriceOverride ??
            (await getBinanceMarketReferencePrice(
              httpClient,
              normalizedSymbol,
              avgPriceMins,
            ));

          const priceFilter =
            getBinanceFilter(
              item.filters,
              "PRICE_FILTER",
            );

          const priceStep =
            optionalPositiveNumber(
              priceFilter?.tickSize,
            ) || null;

          const quotePrecision =
            getBinanceQuotePrecision(item);

          const rules: EffectiveMinimumOrderRules = {
            exchange: exchangeId,
            symbol: normalizedSymbol,
            baseAsset: item.baseAsset,
            quoteAsset: item.quoteAsset,

            quantity: {
              minimum: quantityMinimum,
              maximum: quantityMaximum,
              step: quantityStep,
              precision: item.baseAssetPrecision ?? null,
            },

            marketQuantity: {
              minimum: quantityMinimum,
              maximum: quantityMaximum,
              step: quantityStep,
              precision: item.baseAssetPrecision ?? null,
            },

            price: {
              minimum:
                optionalPositiveNumber(
                  priceFilter?.minPrice,
                ) || null,
              maximum:
                optionalPositiveNumber(
                  priceFilter?.maxPrice,
                ) || null,
              step: priceStep,
              precision: quotePrecision,
            },

    quoteAmount: {
      minimum: null,
      maximum: optionalPositiveNumber(
        getBinanceFilter(
          item.filters,
          "NOTIONAL",
        )?.maxNotional,
      ) || null,
      step: null,
      precision: quotePrecision,
      appliesToMarket: true,
    },

    notional: {
              minimum: minimumNotional > 0
                ? minimumNotional
                : null,
              maximum:
                optionalPositiveNumber(
                  getBinanceFilter(
                    item.filters,
                    "NOTIONAL",
                  )?.maxNotional,
                ) ||
                optionalPositiveNumber(
                  getBinanceFilter(
                    item.filters,
                    "MIN_NOTIONAL",
                  )?.maxNotional,
                ) ||
                null,
              appliesToMarket:
                getBinanceFilter(
                  item.filters,
                  "NOTIONAL",
                )?.applyMinToMarket !== false &&
                getBinanceFilter(
                  item.filters,
                  "MIN_NOTIONAL",
                )?.applyToMarket !== false,
            },

            referencePrice,

            quoteOrderQtyMarketAllowed:
              item.quoteOrderQtyMarketAllowed !== false,
          };

          const minimum =
            calculateEffectiveMinimumOrder(
              rules,
              {
                exchange: exchangeId,
                symbol: normalizedSymbol,
                side: "BUY",
                orderType: "MARKET",
              },
            );

          return {
            symbol: normalizedSymbol,
            quoteAsset: minimum.quoteAsset,
            minimumOrderAmount: minimum.quoteAmount,
            minimumOrderAmountCurrency:
              minimum.quoteAsset,
            quantityMinimum: minimum.quantity,
            minQty: String(minimum.quantity),
            quantityStep: minimum.quantityStep,
            priceStep: minimum.priceStep,
            referencePrice: minimum.referencePrice,
          };
        }

        case "htx": {
          const response = await httpClient.request<HtxSymbolResponse>({
            method: "GET",
            path: "/v1/common/symbols",
          });

          const item = response.data.data.find(
            (entry) =>
              entry.symbol.toUpperCase() === normalizedSymbol,
          );

          if (!item) {
            throw new Error(
              `Symbol ${normalizedSymbol} was not found in HTX /v1/common/symbols`,
            );
          }

          if (
            item.state &&
            item.state.toLowerCase() !== "online"
          ) {
            throw new Error(
              `Symbol ${normalizedSymbol} is not active on HTX`,
            );
          }

          const referencePrice =
            referencePriceOverride ??
            (await getHtxMarketReferencePrice(
              httpClient,
              normalizedSymbol,
            ));

          const minimumQuantity = positiveNumber(
            item["min-order-amt"],
            "HTX minimum order amount",
          );

          const quantityStep = positiveNumber(
            item["limit-order-min-order-amt"] ??
              item["min-order-amt"],
            "HTX quantity step",
          );

          const minimumOrderValue = positiveNumber(
            item["min-order-value"],
            "HTX minimum order value",
          );

          const marketMaximumValue =
            optionalPositiveNumber(
              item["buy-market-max-order-amt"],
            ) || null;

          const rules: EffectiveMinimumOrderRules = {
            exchange: "htx",
            symbol: normalizedSymbol,
            baseAsset: item["base-currency"].toUpperCase(),
            quoteAsset: item["quote-currency"].toUpperCase(),
            quantity: {
              minimum: minimumQuantity,
              maximum:
                optionalPositiveNumber(
                  item["limit-order-max-order-amt"],
                ) || null,
              step: quantityStep,
              precision:
                item["amount-precision"] ?? null,
            },
            marketQuantity: {
              minimum: minimumQuantity,
              maximum: null,
              step: quantityStep,
              precision:
                item["amount-precision"] ?? null,
            },
            price: {
              minimum: null,
              maximum: null,
              step: null,
              precision:
                item["price-precision"] ?? null,
            },
            quoteAmount: {
              minimum: minimumOrderValue,
              maximum: marketMaximumValue,
              step: null,
              precision:
                null,
              appliesToMarket: true,
            },
            notional: {
              minimum: minimumOrderValue,
              maximum: marketMaximumValue,
              appliesToMarket: true,
            },
            referencePrice,
            quoteOrderQtyMarketAllowed: true,
          };

          const minimum = calculateEffectiveMinimumOrder(
            rules,
            {
              exchange: "htx",
              symbol: normalizedSymbol,
              side: "BUY",
              orderType: "MARKET",
            },
          );

          return {
            symbol: minimum.symbol,
            quoteAsset: minimum.quoteAsset,
            minimumOrderAmount: minimum.quoteAmount,
            minimumOrderAmountCurrency: minimum.quoteAsset,
            quantityMinimum: minimum.quantity,
            minQty: String(minimum.quantity),
            quantityStep: minimum.quantityStep,
            priceStep: minimum.priceStep,
            referencePrice: minimum.referencePrice,
          };
        }
      }
    },

    async calculateMinimumOrderAtDrop(
      exchangeId,
      symbol,
      dropPercent,
    ) {
      if (
        !Number.isFinite(dropPercent) ||
        dropPercent < 0 ||
        dropPercent >= 100
      ) {
        throw new Error(
          "DCA drop percentage must be between 0 and 100",
        );
      }

      /*
       * First load the normal exchange-normalized rules. This gives us
       * the current market/reference price without exposing any
       * exchange-specific rule logic to the DCA layer.
       */
      const baseRules = await this.getSymbolRules(
        exchangeId,
        symbol,
      );

      const referencePrice =
        baseRules.referencePrice *
        (1 - dropPercent / 100);

      if (
        !Number.isFinite(referencePrice) ||
        referencePrice <= 0
      ) {
        throw new Error(
          `Invalid DCA reference price for ${symbol} at ${dropPercent}% drop`,
        );
      }

      /*
       * Re-run the same exchange-specific normalization with only the
       * reference price overridden. This preserves every original
       * quantity, market-quantity, price, quote-amount, notional,
       * precision, step, min/max and market-order rule.
       */
      return this.getSymbolRules(
        exchangeId,
        symbol,
        referencePrice,
      );
    }
  };
}
