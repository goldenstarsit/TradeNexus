import type { DatabaseAdapter } from "../databaseAdapter";
import type { Migration } from "./migration";

export const dcaStrategySchemaMigration: Migration = {
  id: 4,
  name: "dca_strategy_schema",

  up(database: DatabaseAdapter): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS dca_strategy_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id INTEGER NOT NULL UNIQUE,
        initial_order_amount TEXT NOT NULL,
        initial_order_currency TEXT NOT NULL DEFAULT 'USDT',
        take_profit_percent TEXT NOT NULL,
        stop_loss_percent TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (strategy_id)
          REFERENCES strategies(id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS dca_strategy_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dca_config_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        amount TEXT NOT NULL,
        drop_percent TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (dca_config_id)
          REFERENCES dca_strategy_configs(id)
          ON DELETE CASCADE,

        UNIQUE (dca_config_id, position)
      );

      CREATE INDEX IF NOT EXISTS idx_dca_strategy_configs_strategy
        ON dca_strategy_configs(strategy_id);

      CREATE INDEX IF NOT EXISTS idx_dca_strategy_orders_config
        ON dca_strategy_orders(dca_config_id);

      CREATE INDEX IF NOT EXISTS idx_dca_strategy_orders_drop
        ON dca_strategy_orders(dca_config_id, drop_percent);
    `);
  },

  down(database: DatabaseAdapter): void {
    database.exec(`
      DROP INDEX IF EXISTS idx_dca_strategy_orders_drop;
      DROP INDEX IF EXISTS idx_dca_strategy_orders_config;
      DROP INDEX IF EXISTS idx_dca_strategy_configs_strategy;
      DROP TABLE IF EXISTS dca_strategy_orders;
      DROP TABLE IF EXISTS dca_strategy_configs;
    `);
  },
};
