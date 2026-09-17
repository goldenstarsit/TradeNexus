import "server-only";

import type { DatabaseAdapter } from "./databaseAdapter";

export interface DatabaseHealth {
  healthy: boolean;
  responseTimeMs: number;
  error?: string;
}

export function checkDatabaseHealth(
  database: DatabaseAdapter,
): DatabaseHealth {
  const startedAt = Date.now();

  try {
    database.get<{ value: number }>("SELECT 1 AS value");

    return {
      healthy: true,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      healthy: false,
      responseTimeMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}
