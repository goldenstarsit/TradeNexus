import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDatabaseAdapter } from "../databaseProvider";
import { MigrationRunner } from "../migrations/migrationRunner";
import { initialSchemaMigration } from "../migrations/001_initial_schema";
import { SystemMetadataRepository } from "../repositories/systemMetadataRepository";
import { checkDatabaseHealth } from "../databaseHealthService";
import { runInTransaction } from "../transaction";

describe("Database integration flow", () => {
  it("runs provider, migrations, repository, transaction and health flow together", () => {
    const database = createDatabaseAdapter({
      driver: "sqlite",
      databasePath: ":memory:",
    });

    new MigrationRunner(
      database,
      [initialSchemaMigration],
    ).run();

    const migration = database.get<{ id: number; name: string }>(
      "SELECT id, name FROM __tradenexus_migrations WHERE id = ?",
      [1],
    );

    assert.deepEqual(migration, {
      id: 1,
      name: "initial_schema",
    });

    const repository = new SystemMetadataRepository(database);

    repository.set("environment", "test");
    repository.set("version", "1");

    assert.equal(repository.count(), 2);
    assert.equal(repository.findByKey("environment")?.value, "test");
    assert.equal(repository.findByKey("version")?.value, "1");

    runInTransaction(database, () => {
      repository.set("transactional", "committed");
    });

    assert.equal(
      repository.findByKey("transactional")?.value,
      "committed",
    );

    assert.equal(repository.deleteById("version"), 1);
    assert.equal(repository.findByKey("version"), undefined);

    const health = checkDatabaseHealth(database);

    assert.equal(health.healthy, true);
    assert.equal(typeof health.responseTimeMs, "number");

    database.close();
  });

  it("rolls back repository changes when an integration transaction fails", () => {
    const database = createDatabaseAdapter({
      driver: "sqlite",
      databasePath: ":memory:",
    });

    new MigrationRunner(
      database,
      [initialSchemaMigration],
    ).run();

    const repository = new SystemMetadataRepository(database);

    assert.throws(() => {
      runInTransaction(database, () => {
        repository.set("rollback-key", "rollback-value");
        throw new Error("integration rollback");
      });
    }, /integration rollback/);

    assert.equal(
      repository.findByKey("rollback-key"),
      undefined,
    );

    database.close();
  });

  it("rolls back a migration when migration execution fails", () => {
    const database = createDatabaseAdapter({
      driver: "sqlite",
      databasePath: ":memory:",
    });

    const failingMigration = {
      id: 2,
      name: "failing_migration",
      up() {
        database.exec(`
          CREATE TABLE integration_failure (
            id INTEGER PRIMARY KEY
          )
        `);
        throw new Error("migration failure");
      },
      down() {
        database.exec(
          "DROP TABLE IF EXISTS integration_failure",
        );
      },
    };

    const runner = new MigrationRunner(
      database,
      [initialSchemaMigration, failingMigration],
    );

    assert.throws(
      () => runner.run(),
      /migration failure/,
    );

    const table = database.get<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = ? AND name = ?",
      ["table", "integration_failure"],
    );

    assert.equal(table, undefined);

    const applied = database.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM __tradenexus_migrations",
    );

    assert.equal(applied?.count, 1);

    database.close();
  });
});
