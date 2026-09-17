import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SQLiteAdapter } from "../adapters/sqliteAdapter";
import { toDatabaseError, DatabaseError } from "../databaseError";
import { MigrationRunner } from "../migrations/migrationRunner";
import { initialSchemaMigration } from "../migrations/001_initial_schema";
import { runWithWriteLock, runWithExclusiveLock } from "../databaseLock";

describe("Database failure handling", () => {
  it("wraps unknown failures as DatabaseError", () => {
    const error = toDatabaseError(
      "query",
      "unexpected failure",
    );

    assert.equal(error instanceof DatabaseError, true);
    assert.equal(error.name, "DatabaseError");
    assert.match(error.message, /Database query failed: unexpected failure/);
    assert.equal(error.cause, "unexpected failure");
  });

  it("preserves an existing DatabaseError", () => {
    const original = new DatabaseError("original failure");

    const result = toDatabaseError(
      "transaction",
      original,
    );

    assert.equal(result, original);
  });

  it("rolls back all writes when a transaction fails", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(`
      CREATE TABLE failure_test (
        id INTEGER PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    assert.throws(() => {
      database.transaction(() => {
        database.run(
          "INSERT INTO failure_test (value) VALUES (?)",
          ["before-failure"],
        );

        database.run(
          "INSERT INTO failure_test (value) VALUES (?)",
          ["second-write"],
        );

        throw new Error("forced transaction failure");
      });
    }, /forced transaction failure/);

    const row = database.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM failure_test",
    );

    assert.equal(row?.count, 0);

    database.close();
  });

  it("rejects invalid SQL without corrupting the database", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(`
      CREATE TABLE failure_test (
        id INTEGER PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    assert.throws(
      () => database.run(
        "INSERT INTO table_that_does_not_exist (value) VALUES (?)",
        ["invalid"],
      ),
      /no such table/i,
    );

    const row = database.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM failure_test",
    );

    assert.equal(row?.count, 0);

    database.close();
  });

  it("rolls back a failed migration and preserves previous migrations", () => {
    const database = new SQLiteAdapter(":memory:");

    const failingMigration = {
      id: 2,
      name: "intentional_failure",
      up() {
        database.exec(`
          CREATE TABLE should_rollback (
            id INTEGER PRIMARY KEY
          )
        `);

        database.run(
          "INSERT INTO should_rollback (id) VALUES (?)",
          [1],
        );

        throw new Error("intentional migration failure");
      },
      down() {
        database.exec(
          "DROP TABLE IF EXISTS should_rollback",
        );
      },
    };

    const runner = new MigrationRunner(
      database,
      [initialSchemaMigration, failingMigration],
    );

    assert.throws(
      () => runner.run(),
      /intentional migration failure/,
    );

    const rolledBackTable = database.get<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = ? AND name = ?",
      ["table", "should_rollback"],
    );

    assert.equal(rolledBackTable, undefined);

    const applied = database.all<{ id: number; name: string }>(
      "SELECT id, name FROM __tradenexus_migrations ORDER BY id",
    );

    assert.deepEqual(applied, [
      {
        id: 1,
        name: "initial_schema",
      },
    ]);

    database.close();
  });

  it("fails safely when rolling back an unregistered migration", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(`
      CREATE TABLE __tradenexus_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    database.run(
      "INSERT INTO __tradenexus_migrations (id, name) VALUES (?, ?)",
      [999, "missing_migration"],
    );

    const runner = new MigrationRunner(
      database,
      [initialSchemaMigration],
    );

    assert.throws(
      () => runner.rollbackLast(),
      /Migration 999 \(missing_migration\) is not registered/,
    );

    const row = database.get<{ id: number; name: string }>(
      "SELECT id, name FROM __tradenexus_migrations WHERE id = ?",
      [999],
    );

    assert.deepEqual(row, {
      id: 999,
      name: "missing_migration",
    });

    database.close();
  });

  it("executes failure-sensitive operations through write locks", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(`
      CREATE TABLE lock_failure_test (
        id INTEGER PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    assert.throws(() => {
      runWithWriteLock(database, () => {
        database.run(
          "INSERT INTO lock_failure_test (value) VALUES (?)",
          ["write-lock"],
        );
        throw new Error("write lock failure");
      });
    }, /write lock failure/);

    assert.equal(
      database.get<{ count: number }>(
        "SELECT COUNT(*) AS count FROM lock_failure_test",
      )?.count,
      0,
    );

    assert.throws(() => {
      runWithExclusiveLock(database, () => {
        database.run(
          "INSERT INTO lock_failure_test (value) VALUES (?)",
          ["exclusive-lock"],
        );
        throw new Error("exclusive lock failure");
      });
    }, /exclusive lock failure/);

    assert.equal(
      database.get<{ count: number }>(
        "SELECT COUNT(*) AS count FROM lock_failure_test",
      )?.count,
      0,
    );

    database.close();
  });
});
