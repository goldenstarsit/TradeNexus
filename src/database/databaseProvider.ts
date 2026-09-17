import { SQLiteAdapter } from "./adapters/sqliteAdapter";
import type { DatabaseAdapter } from "./databaseAdapter";

export type DatabaseDriver = "sqlite";

export interface DatabaseProviderOptions {
  driver?: DatabaseDriver;
  databasePath: string;
}

export function createDatabaseAdapter(
  options: DatabaseProviderOptions,
): DatabaseAdapter {
  const driver = options.driver ?? "sqlite";

  switch (driver) {
    case "sqlite":
      return new SQLiteAdapter(options.databasePath);

    default: {
      const exhaustiveDriver: never = driver;
      throw new Error(
        `Unsupported database driver: ${String(exhaustiveDriver)}`,
      );
    }
  }
}
