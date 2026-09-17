import type { SqlValue } from "../databaseAdapter";

export interface Repository {
  findById<T = unknown>(
    id: SqlValue,
  ): T | undefined;

  findAll<T = unknown>(): T[];

  count(): number;

  deleteById(id: SqlValue): number;
}
