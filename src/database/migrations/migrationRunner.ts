import type { DatabaseAdapter } from "../databaseAdapter";
import type { Migration } from "./migration";

const MIGRATION_TABLE = "__tradenexus_migrations";

export class MigrationRunner {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly migrations: readonly Migration[],
  ) {}

  run(): void {
    this.ensureMigrationTable();

    const applied = new Set(
      this.database
        .all<{ id: number }>(
          `SELECT id FROM ${MIGRATION_TABLE} ORDER BY id`,
        )
        .map((row) => row.id),
    );

    const pending = this.migrations
      .filter((migration) => !applied.has(migration.id))
      .sort((a, b) => a.id - b.id);

    for (const migration of pending) {
      this.database.transaction(() => {
        migration.up(this.database);

        this.database.run(
          `INSERT INTO ${MIGRATION_TABLE} (id, name) VALUES (?, ?)`,
          [migration.id, migration.name],
        );
      });
    }
  }

  rollbackLast(): void {
    this.ensureMigrationTable();

    const last = this.database.get<{ id: number; name: string }>(
      `SELECT id, name FROM ${MIGRATION_TABLE} ORDER BY id DESC LIMIT 1`,
    );

    if (!last) {
      return;
    }

    const migration = this.migrations.find(
      (item) => item.id === last.id,
    );

    if (!migration) {
      throw new Error(
        `Migration ${last.id} (${last.name}) is not registered`,
      );
    }

    this.database.transaction(() => {
      migration.down(this.database);

      this.database.run(
        `DELETE FROM ${MIGRATION_TABLE} WHERE id = ?`,
        [last.id],
      );
    });
  }

  private ensureMigrationTable(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}
