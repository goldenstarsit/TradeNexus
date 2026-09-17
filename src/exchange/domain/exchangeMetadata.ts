import type { ExchangeId } from "./exchangeId";
import type { ExchangeStatus } from "./exchangeStatus";

export interface ExchangeMetadata {
  id: ExchangeId;
  name: string;
  status: ExchangeStatus;
  baseUrl: string;
  marketTypes: readonly ("spot" | "futures")[];
}
