import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SQLiteAdapter } from "../adapters/sqliteAdapter";
import {
  runWithExclusiveLock,
  runWithWriteLock,
} from "../databaseLock";
import {
  DatabaseError,
  toDatabaseError,
} from "../databaseError";

describe("SQLiteAdapter", () => {
  it("executes queries and returns rows", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(`
      CREATE TABLE test (
        id INTEGER PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    const result = database.run(
      "INSERT INTO test (value) VALUES (?)",
      ["hello"],
    );

    assert.equal(result.changes, 1);

    const row = database.get<{ id: number; value: string }>(
      "SELECT id, value FROM test WHERE id = ?",
      [result.lastInsertRowid],
    );

    assert.deepEqual(row, {
      id: 1,
      value: "hello",
    });

    database.close();
  });

  it("commits a transaction", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(
      "CREATE TABLE test (value TEXT NOT NULL)",
    );

    database.transaction(() => {
      database.run(
        "INSERT INTO test (value) VALUES (?)",
        ["committed"],
      );
    });

    const row = database.get<{ value: string }>(
      "SELECT value FROM test LIMIT 1",
    );

    assert.equal(row?.value, "committed");

    database.close();
  });

  it("rolls back a failed transaction", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(
      "CREATE TABLE test (value TEXT NOT NULL)",
    );

    assert.throws(() => {
      database.transaction(() => {
        database.run(
          "INSERT INTO test (value) VALUES (?)",
          ["rolled-back"],
        );
        throw new Error("forced rollback");
      });
    }, /forced rollback/);

    const row = database.get(
      "SELECT value FROM test LIMIT 1",
    );

    assert.equal(row, undefined);

    database.close();
  });
});

describe("Database locking", () => {
  it("runs a write operation with an immediate lock", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(
      "CREATE TABLE test (value TEXT NOT NULL)",
    );

    const result = runWithWriteLock(database, () => {
      database.run(
        "INSERT INTO test (value) VALUES (?)",
        ["write-locked"],
      );

      return database.get<{ value: string }>(
        "SELECT value FROM test LIMIT 1",
      );
    });

    assert.equal(result?.value, "write-locked");

    database.close();
  });

  it("runs an operation with an exclusive lock", () => {
    const database = new SQLiteAdapter(":memory:");

    database.exec(
      "CREATE TABLE test (value TEXT NOT NULL)",
    );

    runWithExclusiveLock(database, () => {
      database.run(
        "INSERT INTO test (value) VALUES (?)",
        ["exclusive"],
      );
    });

    const row = database.get<{ value: string }>(
      "SELECT value FROM test LIMIT 1",
    );

    assert.equal(row?.value, "exclusive");

    database.close();
  });
});

describe("DatabaseError", () => {
  it("wraps an Error with operation context", () => {
    const cause = new Error("connection failed");
    const error = toDatabaseError("query", cause);

    assert.ok(error instanceof DatabaseError);
    assert.equal(
      error.message,
      "Database query failed: connection failed",
    );
    assert.equal(error.cause, cause);
  });

  it("preserves an existing DatabaseError", () => {
    const original = new DatabaseError("already normalized");

    assert.equal(
      toDatabaseError("query", original),
      original,
    );
  });
});
