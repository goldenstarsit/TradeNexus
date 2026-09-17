import "server-only";

import type { DatabaseAdapter } from "../databaseAdapter";
import type { Migration } from "./migration";

export const initialSchemaMigration: Migration = {
  id: 1,
  name: "initial_schema",

  up(database: DatabaseAdapter): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS system_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },

  down(database: DatabaseAdapter): void {
    database.exec(`
      DROP TABLE IF EXISTS system_metadata
    `);
  },
};
