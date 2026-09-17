import "server-only";

import { getDatabase } from "./databaseManager";

export function runInTransaction<T>(callback: () => T): T {
  return getDatabase().transaction(callback);
}
