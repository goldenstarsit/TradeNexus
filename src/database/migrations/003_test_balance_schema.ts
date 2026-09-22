import type { DatabaseAdapter } from "../databaseAdapter";
import type { Migration } from "./migration";

export const testBalanceSchemaMigration: Migration = {
  id: 3,
  name: "test_balance_schema",

  up(database: DatabaseAdapter): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS test_balances (
        account_id TEXT NOT NULL,
        asset TEXT NOT NULL,
        available REAL NOT NULL DEFAULT 0,
        reserved REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (account_id, asset),
        CHECK (available >= 0),
        CHECK (reserved >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_test_balances_account
        ON test_balances(account_id);
    `);
  },

  down(database: DatabaseAdapter): void {
    database.exec(`
      DROP INDEX IF EXISTS idx_test_balances_account;
      DROP TABLE IF EXISTS test_balances;
    `);
  },
};
