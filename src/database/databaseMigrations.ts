import type { Migration } from "./migrations/migration";
import { initialSchemaMigration } from "./migrations/001_initial_schema";
import { strategySchemaMigration } from "./migrations/002_strategy_schema";
import { testBalanceSchemaMigration } from "./migrations/003_test_balance_schema";

export const databaseMigrations: readonly Migration[] = [
  initialSchemaMigration,
  strategySchemaMigration,
  testBalanceSchemaMigration,
];
