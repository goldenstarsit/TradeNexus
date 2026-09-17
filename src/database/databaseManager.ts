import "server-only";

import { createDatabaseAdapter } from "./databaseProvider";
import {
  DATABASE_DRIVER,
  DATABASE_PATH,
} from "./databaseConfig";
import type { DatabaseAdapter } from "./databaseAdapter";

let database: DatabaseAdapter | undefined;

export function getDatabase(): DatabaseAdapter {
  if (!database) {
    database = createDatabaseAdapter({
      driver: DATABASE_DRIVER,
      databasePath: DATABASE_PATH,
    });
  }

  return database;
}

export function closeDatabase(): void {
  if (database) {
    database.close();
    database = undefined;
  }
}
