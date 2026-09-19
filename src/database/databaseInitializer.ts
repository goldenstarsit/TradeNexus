import { getDatabase } from "./databaseManager";
import { MigrationRunner } from "./migrations/migrationRunner";
import { databaseMigrations } from "./databaseMigrations";

export function initializeDatabase(): void {
  const database = getDatabase();

  new MigrationRunner(database, databaseMigrations).run();
}
