import type { DatabaseAdapter } from "../databaseAdapter";
import type { Migration } from "./migration";

export const dcaStrategyTypeModelMigration: Migration = {
  id: 5,
  name: "dca_strategy_type_model",

  up(database: DatabaseAdapter): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS strategy_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_type TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO strategy_types (strategy_type)
      VALUES ('DCA');

      CREATE TABLE dca_strategy_configs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_type_id INTEGER NOT NULL,
        strategy_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        balance_mode TEXT NOT NULL
          CHECK (balance_mode IN ('live', 'test')),
        balance_account_id TEXT NOT NULL,
        exchange_id TEXT NOT NULL,
        market_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        initial_order_amount TEXT NOT NULL,
        initial_order_currency TEXT NOT NULL DEFAULT 'USDT',
        take_profit_percent TEXT NOT NULL,
        stop_loss_percent TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'paused', 'stopped')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (strategy_type_id)
          REFERENCES strategy_types(id)
          ON DELETE RESTRICT
      );

      INSERT INTO dca_strategy_configs_new (
        id,
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
        status,
        created_at,
        updated_at
      )
      SELECT
        c.id,
        st.id,
        s.strategy_id,
        s.name,
        s.balance_mode,
        s.balance_account_id,
        s.exchange_id,
        s.market_type,
        s.symbol,
        s.execution_mode,
        c.initial_order_amount,
        c.initial_order_currency,
        c.take_profit_percent,
        c.stop_loss_percent,
        s.status,
        c.created_at,
        c.updated_at
      FROM dca_strategy_configs c
      INNER JOIN strategies s
        ON s.id = c.strategy_id
      INNER JOIN strategy_types st
        ON st.strategy_type = 'DCA';

      CREATE TABLE dca_strategy_orders_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dca_config_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        amount TEXT NOT NULL,
        drop_percent TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (dca_config_id)
          REFERENCES dca_strategy_configs_new(id)
          ON DELETE CASCADE,

        UNIQUE (dca_config_id, position)
      );

      INSERT INTO dca_strategy_orders_new (
        id,
        dca_config_id,
        position,
        amount,
        drop_percent,
        created_at,
        updated_at
      )
      SELECT
        o.id,
        o.dca_config_id,
        o.position,
        o.amount,
        o.drop_percent,
        o.created_at,
        o.updated_at
      FROM dca_strategy_orders o;

      DROP TABLE dca_strategy_orders;
      DROP TABLE dca_strategy_configs;
      DROP TABLE strategies;

      ALTER TABLE dca_strategy_configs_new
        RENAME TO dca_strategy_configs;

      ALTER TABLE dca_strategy_orders_new
        RENAME TO dca_strategy_orders;

      CREATE INDEX idx_dca_strategy_configs_type
        ON dca_strategy_configs(strategy_type_id);

      CREATE INDEX idx_dca_strategy_configs_symbol
        ON dca_strategy_configs(exchange_id, symbol);

      CREATE INDEX idx_dca_strategy_configs_balance_mode
        ON dca_strategy_configs(balance_mode);

      CREATE INDEX idx_dca_strategy_configs_status
        ON dca_strategy_configs(status);

      CREATE INDEX idx_dca_strategy_orders_config
        ON dca_strategy_orders(dca_config_id);

      CREATE INDEX idx_dca_strategy_orders_drop
        ON dca_strategy_orders(dca_config_id, drop_percent);
    `);
  },

  down(database: DatabaseAdapter): void {
    database.exec(`
      DROP INDEX IF EXISTS idx_dca_strategy_orders_drop;
      DROP INDEX IF EXISTS idx_dca_strategy_orders_config;
      DROP INDEX IF EXISTS idx_dca_strategy_configs_status;
      DROP INDEX IF EXISTS idx_dca_strategy_configs_balance_mode;
      DROP INDEX IF EXISTS idx_dca_strategy_configs_symbol;
      DROP INDEX IF EXISTS idx_dca_strategy_configs_type;

      DROP TABLE IF EXISTS dca_strategy_orders;
      DROP TABLE IF EXISTS dca_strategy_configs;
      DROP TABLE IF EXISTS strategy_types;
    `);
  },
};
