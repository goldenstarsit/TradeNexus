import type { DatabaseAdapter } from "./databaseAdapter";

export function runInTransaction<T>(
  database: DatabaseAdapter,
  callback: () => T,
): T {
  return database.transaction(callback);
}
