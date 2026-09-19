import type { Migration } from "./migrations/migration";
import { initialSchemaMigration } from "./migrations/001_initial_schema";
import { strategySchemaMigration } from "./migrations/002_strategy_schema";

export const databaseMigrations: readonly Migration[] = [
  initialSchemaMigration,
  strategySchemaMigration,
];
