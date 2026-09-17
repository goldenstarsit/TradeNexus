import Database from "better-sqlite3";
import type {
  DatabaseAdapter,
  RunResult,
  SqlValue,
} from "../databaseAdapter";

export class SQLiteAdapter implements DatabaseAdapter {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);

    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(
    sql: string,
    params: readonly SqlValue[] = [],
  ): RunResult {
    const result = this.db.prepare(sql).run(...params);

    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  get<T = unknown>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T = unknown>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  transaction<T>(callback: () => T): T {
    return this.db.transaction(callback)();
  }

  close(): void {
    this.db.close();
  }
}
