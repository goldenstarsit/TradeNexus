import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  DatabaseAdapter,
  RunResult,
  SqlValue,
  TransactionMode,
} from "../databaseAdapter";
import { SystemMetadataRepository } from "../repositories/systemMetadataRepository";
import { checkDatabaseHealth } from "../databaseHealthService";
import { runInTransaction } from "../transaction";

type MetadataRow = {
  key: string;
  value: string;
  updated_at: string;
};

class FakeDatabaseAdapter implements DatabaseAdapter {
  private readonly metadata = new Map<string, MetadataRow>();
  private transactionDepth = 0;

  exec(sql: string): void {
    if (!sql.trim()) {
      throw new Error("SQL cannot be empty");
    }
  }

  run(
    sql: string,
    params: readonly SqlValue[] = [],
  ): RunResult {
    if (/INSERT INTO system_metadata/i.test(sql)) {
      const key = String(params[0]);
      const value = String(params[1]);

      this.metadata.set(key, {
        key,
        value,
        updated_at: new Date().toISOString(),
      });

      return {
        changes: 1,
        lastInsertRowid: 1,
      };
    }

    if (/DELETE FROM system_metadata/i.test(sql)) {
      const key = String(params[0]);
      const changes = this.metadata.delete(key) ? 1 : 0;

      return {
        changes,
        lastInsertRowid: 0,
      };
    }

    throw new Error(`Unsupported fake SQL: ${sql}`);
  }

  get<T = unknown>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): T | undefined {
    if (/SELECT \* FROM system_metadata/i.test(sql)) {
      const key = String(params[0]);
      return this.metadata.get(key) as T | undefined;
    }

    if (/COUNT\(\*\) AS count FROM system_metadata/i.test(sql)) {
      return {
        count: this.metadata.size,
      } as T;
    }

    if (/SELECT 1 AS value/i.test(sql)) {
      return {
        value: 1,
      } as T;
    }

    throw new Error(`Unsupported fake SQL: ${sql}`);
  }

  all<T = unknown>(sql: string): T[] {
    if (/SELECT \* FROM system_metadata/i.test(sql)) {
      return Array.from(this.metadata.values()) as T[];
    }

    throw new Error(`Unsupported fake SQL: ${sql}`);
  }

  transaction<T>(
    callback: () => T,
    _mode: TransactionMode = "deferred",
  ): T {
    this.transactionDepth += 1;

    try {
      return callback();
    } finally {
      this.transactionDepth -= 1;
    }
  }

  close(): void {}
}

describe("Database replacement abstraction", () => {
  it("uses repository and health layers without SQLite", () => {
    const database = new FakeDatabaseAdapter();
    const repository = new SystemMetadataRepository(database);

    repository.set("driver", "fake");
    repository.set("replacement", "verified");

    assert.equal(repository.count(), 2);
    assert.equal(
      repository.findByKey("driver")?.value,
      "fake",
    );
    assert.equal(
      repository.findByKey("replacement")?.value,
      "verified",
    );

    const health = checkDatabaseHealth(database);

    assert.equal(health.healthy, true);
    assert.equal(typeof health.responseTimeMs, "number");
  });

  it("uses the generic transaction layer with a non-SQLite adapter", () => {
    const database = new FakeDatabaseAdapter();
    const repository = new SystemMetadataRepository(database);

    runInTransaction(database, () => {
      repository.set("transaction", "works");
    });

    assert.equal(
      repository.findByKey("transaction")?.value,
      "works",
    );
  });

  it("supports the generic repository contract without SQLite types", () => {
    const database = new FakeDatabaseAdapter();
    const repository = new SystemMetadataRepository(database);

    repository.set("delete-me", "value");

    assert.equal(repository.deleteById("delete-me"), 1);
    assert.equal(
      repository.findByKey("delete-me"),
      undefined,
    );
  });

  it("keeps the generic adapter contract independent from SQLite", () => {
    const database: DatabaseAdapter = new FakeDatabaseAdapter();

    assert.equal(
      database.get<{ value: number }>("SELECT 1 AS value")?.value,
      1,
    );

    database.transaction(() => {
      database.exec("SELECT 1");
    });

    database.close();
  });
});
