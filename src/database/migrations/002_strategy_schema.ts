import type { DatabaseAdapter } from "../databaseAdapter";
import type { Migration } from "./migration";

export const strategySchemaMigration: Migration = {
  id: 2,
  name: "strategy_schema",

  up(database: DatabaseAdapter): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id TEXT NOT NULL,
        name TEXT NOT NULL,
        balance_mode TEXT NOT NULL CHECK (balance_mode IN ('live', 'test')),
        balance_account_id TEXT NOT NULL,
        exchange_id TEXT NOT NULL,
        market_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        configuration_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'paused', 'stopped')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_strategies_status
        ON strategies(status);

      CREATE INDEX IF NOT EXISTS idx_strategies_balance_mode
        ON strategies(balance_mode);

      CREATE INDEX IF NOT EXISTS idx_strategies_exchange_symbol
        ON strategies(exchange_id, symbol);
    `);
  },

  down(database: DatabaseAdapter): void {
    database.exec(`
      DROP INDEX IF EXISTS idx_strategies_exchange_symbol;
      DROP INDEX IF EXISTS idx_strategies_balance_mode;
      DROP INDEX IF EXISTS idx_strategies_status;
      DROP TABLE IF EXISTS strategies;
    `);
  },
};
