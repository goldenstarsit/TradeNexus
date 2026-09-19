import type { DatabaseAdapter } from "../databaseAdapter";
import { BaseRepository } from "./baseRepository";

export type StrategyStatus = "active" | "paused" | "stopped";
export type StrategyBalanceMode = "live" | "test";

export interface PersistedStrategy {
  id: number;
  strategy_id: string;
  name: string;
  balance_mode: StrategyBalanceMode;
  balance_account_id: string;
  exchange_id: string;
  market_type: string;
  symbol: string;
  execution_mode: string;
  configuration_json: string;
  status: StrategyStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatePersistedStrategyInput {
  strategyId: string;
  name: string;
  balanceMode: StrategyBalanceMode;
  balanceAccountId: string;
  exchangeId: string;
  marketType: string;
  symbol: string;
  executionMode: string;
  configurationJson: string;
  status?: StrategyStatus;
}

export class StrategyRepository extends BaseRepository {
  constructor(database: DatabaseAdapter) {
    super(database, "strategies");
  }

  create(input: CreatePersistedStrategyInput): PersistedStrategy {
    const result = this.database.run(
      `INSERT INTO strategies (
        strategy_id,
        name,
        balance_mode,
        balance_account_id,
        exchange_id,
        market_type,
        symbol,
        execution_mode,
        configuration_json,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.strategyId,
        input.name,
        input.balanceMode,
        input.balanceAccountId,
        input.exchangeId,
        input.marketType,
        input.symbol,
        input.executionMode,
        input.configurationJson,
        input.status ?? "active",
      ],
    );

    const strategy = this.findById<PersistedStrategy>(result.lastInsertRowid);

    if (!strategy) {
      throw new Error("Strategy was created but could not be loaded");
    }

    return strategy;
  }

  findByStrategyId(strategyId: string): PersistedStrategy[] {
    return this.database.all<PersistedStrategy>(
      `SELECT * FROM strategies
       WHERE strategy_id = ?
       ORDER BY id ASC`,
      [strategyId],
    );
  }

  findByBalanceMode(
    balanceMode: StrategyBalanceMode,
  ): PersistedStrategy[] {
    return this.database.all<PersistedStrategy>(
      `SELECT * FROM strategies
       WHERE balance_mode = ?
       ORDER BY id ASC`,
      [balanceMode],
    );
  }

  updateStatus(id: number, status: StrategyStatus): void {
    const result = this.database.run(
      `UPDATE strategies
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id],
    );

    if (result.changes !== 1) {
      throw new Error(`Strategy ${id} was not found`);
    }
  }
}
