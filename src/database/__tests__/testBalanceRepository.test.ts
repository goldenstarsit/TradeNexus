import assert from "node:assert/strict";
import test from "node:test";

import { SQLiteAdapter } from "../adapters/sqliteAdapter";
import { MigrationRunner } from "../migrations/migrationRunner";
import { databaseMigrations } from "../databaseMigrations";
import {
  TestBalanceRepository,
} from "../repositories/testBalanceRepository";

function createDatabase() {
  const database = new SQLiteAdapter(":memory:");

  new MigrationRunner(database, databaseMigrations).run();

  return database;
}

test("test balance repository persists and reloads balances", () => {
  const database = createDatabase();

  try {
    const repository = new TestBalanceRepository(database);

    repository.upsert({
      accountId: "persist-account",
      asset: "USDT",
      available: 750,
      reserved: 250,
    });

    const persisted = repository.findByAccountAndAsset(
      "persist-account",
      "USDT",
    );

    assert.ok(persisted);
    assert.equal(persisted.account_id, "persist-account");
    assert.equal(persisted.asset, "USDT");
    assert.equal(persisted.available, 750);
    assert.equal(persisted.reserved, 250);

    assert.deepEqual(
      repository.findByAccount("persist-account").map((item) => ({
        asset: item.asset,
        available: item.available,
        reserved: item.reserved,
      })),
      [
        {
          asset: "USDT",
          available: 750,
          reserved: 250,
        },
      ],
    );
  } finally {
    database.close();
  }
});
