import type { DatabaseAdapter } from "../databaseAdapter";
import { BaseRepository } from "./baseRepository";

export interface DcaStrategyOrderInput {
  readonly position: number;
  readonly amount: string;
  readonly dropPercent: string;
}

export interface CreateDcaStrategyInput {
  readonly strategyId: string;
  readonly name: string;
  readonly balanceMode: "live" | "test";
  readonly balanceAccountId: string;
  readonly exchangeId: string;
  readonly marketType: string;
  readonly symbol: string;
  readonly executionMode: string;
  readonly status?: "active" | "paused" | "stopped";
  readonly initialOrderAmount: string;
  readonly initialOrderCurrency: string;
  readonly takeProfitPercent: string;
  readonly stopLossPercent: string;
  readonly orders: readonly DcaStrategyOrderInput[];
}

export interface PersistedDcaStrategyType {
  readonly id: number;
  readonly strategy_type: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PersistedDcaStrategyConfig {
  readonly id: number;
  readonly strategy_type_id: number;
  readonly strategy_id: string;
  readonly name: string;
  readonly balance_mode: "live" | "test";
  readonly balance_account_id: string;
  readonly exchange_id: string;
  readonly market_type: string;
  readonly symbol: string;
  readonly execution_mode: string;
  readonly initial_order_amount: string;
  readonly initial_order_currency: string;
  readonly take_profit_percent: string;
  readonly stop_loss_percent: string;
  readonly status: "active" | "paused" | "stopped";
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PersistedDcaStrategyOrder {
  readonly id: number;
  readonly dca_config_id: number;
  readonly position: number;
  readonly amount: string;
  readonly drop_percent: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PersistedDcaStrategy {
  readonly strategyType: PersistedDcaStrategyType;
  readonly config: PersistedDcaStrategyConfig;
  readonly orders: readonly PersistedDcaStrategyOrder[];
}

export class DcaStrategyRepository extends BaseRepository {
  constructor(database: DatabaseAdapter) {
    super(database, "dca_strategy_configs");
  }

  private findDcaStrategyType(): PersistedDcaStrategyType {
    const strategyType =
      this.database.get<PersistedDcaStrategyType>(
        `SELECT *
         FROM strategy_types
         WHERE strategy_type = ?`,
        ["DCA"],
      );

    if (!strategyType) {
      throw new Error(
        "DCA strategy type is not registered",
      );
    }

    return strategyType;
  }

  createStrategy(
    input: CreateDcaStrategyInput,
  ): PersistedDcaStrategy {
    return this.database.transaction(() => {
      const strategyType = this.findDcaStrategyType();

      const existing =
        this.database.get<{ id: number }>(
          `SELECT id
           FROM dca_strategy_configs
           WHERE strategy_id = ?`,
          [input.strategyId],
        );

      if (existing) {
        throw new Error(
          `DCA strategy ${input.strategyId} already exists`,
        );
      }

      const configResult = this.database.run(
        `INSERT INTO dca_strategy_configs (
          strategy_type_id,
          strategy_id,
          name,
          balance_mode,
          balance_account_id,
          exchange_id,
          market_type,
          symbol,
          execution_mode,
          initial_order_amount,
          initial_order_currency,
          take_profit_percent,
          stop_loss_percent,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          strategyType.id,
          input.strategyId,
          input.name,
          input.balanceMode,
          input.balanceAccountId,
          input.exchangeId,
          input.marketType,
          input.symbol,
          input.executionMode,
          input.initialOrderAmount,
          input.initialOrderCurrency,
          input.takeProfitPercent,
          input.stopLossPercent,
          input.status ?? "active",
        ],
      );

      const configId = Number(
        configResult.lastInsertRowid,
      );

      for (const order of input.orders) {
        this.database.run(
          `INSERT INTO dca_strategy_orders (
            dca_config_id,
            position,
            amount,
            drop_percent
          ) VALUES (?, ?, ?, ?)`,
          [
            configId,
            order.position,
            order.amount,
            order.dropPercent,
          ],
        );
      }

      return this.findByConfigId(configId);
    });
  }

  updateByConfigId(
    configId: number,
    input: CreateDcaStrategyInput,
  ): PersistedDcaStrategy {
    return this.database.transaction(() => {
      const existing =
        this.database.get<{ id: number }>(
          `SELECT id
           FROM dca_strategy_configs
           WHERE id = ?`,
          [configId],
        );

      if (!existing) {
        throw new Error(
          `DCA configuration ${configId} was not found`,
        );
      }

      const strategyType = this.findDcaStrategyType();

      this.database.run(
        `UPDATE dca_strategy_configs
         SET
           strategy_type_id = ?,
           name = ?,
           balance_mode = ?,
           balance_account_id = ?,
           exchange_id = ?,
           market_type = ?,
           symbol = ?,
           execution_mode = ?,
           initial_order_amount = ?,
           initial_order_currency = ?,
           take_profit_percent = ?,
           stop_loss_percent = ?,
           status = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          strategyType.id,
          input.name,
          input.balanceMode,
          input.balanceAccountId,
          input.exchangeId,
          input.marketType,
          input.symbol,
          input.executionMode,
          input.initialOrderAmount,
          input.initialOrderCurrency,
          input.takeProfitPercent,
          input.stopLossPercent,
          input.status ?? "active",
          configId,
        ],
      );

      this.database.run(
        `DELETE FROM dca_strategy_orders
         WHERE dca_config_id = ?`,
        [configId],
      );

      for (const order of input.orders) {
        this.database.run(
          `INSERT INTO dca_strategy_orders (
            dca_config_id,
            position,
            amount,
            drop_percent
          ) VALUES (?, ?, ?, ?)`,
          [
            configId,
            order.position,
            order.amount,
            order.dropPercent,
          ],
        );
      }

      return this.findByConfigId(configId);
    });
  }

  deleteByConfigId(configId: number): void {
    const existing =
      this.database.get<{ id: number }>(
        `SELECT id
         FROM dca_strategy_configs
         WHERE id = ?`,
        [configId],
      );

    if (!existing) {
      throw new Error(
        `DCA configuration ${configId} was not found`,
      );
    }

    this.database.transaction(() => {
      this.database.run(
        `DELETE FROM dca_strategy_orders
         WHERE dca_config_id = ?`,
        [configId],
      );

      this.database.run(
        `DELETE FROM dca_strategy_configs
         WHERE id = ?`,
        [configId],
      );
    });
  }

  findByConfigId(
    configId: number,
  ): PersistedDcaStrategy {
    const config =
      this.database.get<PersistedDcaStrategyConfig>(
        `SELECT *
         FROM dca_strategy_configs
         WHERE id = ?`,
        [configId],
      );

    if (!config) {
      throw new Error(
        `DCA configuration ${configId} was not found`,
      );
    }

    const strategyType =
      this.database.get<PersistedDcaStrategyType>(
        `SELECT *
         FROM strategy_types
         WHERE id = ?`,
        [config.strategy_type_id],
      );

    if (!strategyType) {
      throw new Error(
        `Strategy type ${config.strategy_type_id} was not found`,
      );
    }

    const orders =
      this.database.all<PersistedDcaStrategyOrder>(
        `SELECT *
         FROM dca_strategy_orders
         WHERE dca_config_id = ?
         ORDER BY position ASC`,
        [configId],
      );

    return {
      strategyType,
      config,
      orders,
    };
  }

  findByStrategyId(
    strategyId: string,
  ): PersistedDcaStrategy | null {
    const config =
      this.database.get<PersistedDcaStrategyConfig>(
        `SELECT *
         FROM dca_strategy_configs
         WHERE strategy_id = ?`,
        [strategyId],
      );

    if (!config) {
      return null;
    }

    return this.findByConfigId(config.id);
  }

  findAllDcaStrategies(): PersistedDcaStrategy[] {
    const configs =
      this.database.all<PersistedDcaStrategyConfig>(
        `SELECT *
         FROM dca_strategy_configs
         ORDER BY id ASC`,
      );

    return configs.map((config) =>
      this.findByConfigId(config.id),
    );
  }
}
