import type {
  DatabaseAdapter,
  SqlValue,
} from "../databaseAdapter";
import type { Repository } from "./repository";

export abstract class BaseRepository implements Repository {
  protected constructor(
    protected readonly database: DatabaseAdapter,
    private readonly tableName: string,
    private readonly idColumn = "id",
  ) {}

  findById<T = unknown>(
    id: SqlValue,
  ): T | undefined {
    return this.database.get<T>(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ? LIMIT 1`,
      [id],
    );
  }

  findAll<T = unknown>(): T[] {
    return this.database.all<T>(
      `SELECT * FROM ${this.tableName}`,
    );
  }

  count(): number {
    const row = this.database.get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${this.tableName}`,
    );

    return row?.count ?? 0;
  }

  deleteById(id: SqlValue): number {
    return this.database.run(
      `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      [id],
    ).changes;
  }
}
