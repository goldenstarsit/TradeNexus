import type { ExchangeId } from "../domain/exchangeId";
import type { MarketType } from "../domain/marketType";

export interface ExchangeConfig {
  readonly id: ExchangeId;
  readonly name: string;
  readonly baseUrl: string;
  readonly marketTypes: readonly MarketType[];
  readonly enabled: boolean;
}
