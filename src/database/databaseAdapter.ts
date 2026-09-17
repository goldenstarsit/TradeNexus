export type SqlValue = string | number | bigint | boolean | null | Buffer;

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface DatabaseAdapter {
  exec(sql: string): void;

  run(
    sql: string,
    params?: readonly SqlValue[],
  ): RunResult;

  get<T = unknown>(
    sql: string,
    params?: readonly SqlValue[],
  ): T | undefined;

  all<T = unknown>(
    sql: string,
    params?: readonly SqlValue[],
  ): T[];

  transaction<T>(
    callback: () => T,
  ): T;

  close(): void;
}
