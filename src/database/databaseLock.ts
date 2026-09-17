import type { DatabaseAdapter } from "./databaseAdapter";

export function runWithWriteLock<T>(
  database: DatabaseAdapter,
  callback: () => T,
): T {
  return database.transaction(callback, "immediate");
}

export function runWithExclusiveLock<T>(
  database: DatabaseAdapter,
  callback: () => T,
): T {
  return database.transaction(callback, "exclusive");
}
