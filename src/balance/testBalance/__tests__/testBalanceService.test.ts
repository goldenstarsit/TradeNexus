import assert from "node:assert/strict";
import test from "node:test";

import { createDatabaseAdapter } from "@/src/database/databaseProvider";
import { databaseMigrations } from "@/src/database/databaseMigrations";
import { MigrationRunner } from "@/src/database/migrations/migrationRunner";
import { TestBalanceRepository } from "@/src/database/repositories/testBalanceRepository";
import { createTestBalanceService } from "../testBalanceService";

function createTestService() {
  const database = createDatabaseAdapter({
    driver: "sqlite",
    databasePath: ":memory:",
  });

  new MigrationRunner(database, databaseMigrations).run();

  const repository = new TestBalanceRepository(database);

  return {
    service: createTestBalanceService({ repository }),
    database,
  };
}

test("test balance service creates isolated test accounts", () => {
  const { service, database } = createTestService();

  try {
    service.depositTestBalance("api-account-a", "USDT", 1000);
    service.depositTestBalance("api-account-b", "USDT", 500);

    assert.equal(service.getTestBalance("api-account-a", "USDT").total, 1000);
    assert.equal(service.getTestBalance("api-account-b", "USDT").total, 500);
  } finally {
    database.close();
  }
});

test("test balance service deposits and withdraws available balance", () => {
  const { service, database } = createTestService();

  try {
    service.depositTestBalance("api-account-c", "USDT", 1000);

    assert.deepEqual(service.getTestBalance("api-account-c", "USDT"), {
      asset: "USDT",
      available: 1000,
      reserved: 0,
      total: 1000,
    });

    assert.deepEqual(
      service.withdrawTestBalance("api-account-c", "USDT", 250),
      {
        asset: "USDT",
        available: 750,
        reserved: 0,
        total: 750,
      },
    );
  } finally {
    database.close();
  }
});

test("test balance service rejects insufficient withdrawal", () => {
  const { service, database } = createTestService();

  try {
    service.depositTestBalance("api-account-d", "USDT", 100);

    assert.throws(
      () => service.withdrawTestBalance("api-account-d", "USDT", 101),
      /Insufficient available USDT balance/,
    );
  } finally {
    database.close();
  }
});

test("test balance service rejects invalid account IDs", () => {
  const { service, database } = createTestService();

  try {
    assert.throws(
      () => service.getTestBalance("   ", "USDT"),
      /Balance account ID must not be empty/,
    );
  } finally {
    database.close();
  }
});

test("test balance service persists balance mutations", () => {
  const { service, database } = createTestService();

  try {
    service.depositTestBalance("persisted-account", "USDT", 1000);

    const repository = new TestBalanceRepository(database);
    const persisted = repository.findByAccountAndAsset(
      "persisted-account",
      "USDT",
    );

    assert.ok(persisted);
    assert.equal(persisted.account_id, "persisted-account");
    assert.equal(persisted.asset, "USDT");
    assert.equal(persisted.available, 1000);
    assert.equal(persisted.reserved, 0);
  } finally {
    database.close();
  }
});

test("test balance service reloads persisted reserved balance", () => {
  const { service, database } = createTestService();

  try {
    service.depositTestBalance("reload-account", "USDT", 1000);

    const firstAccount = service.getTestBalanceAccount("reload-account");
    firstAccount.reserve("USDT", 250);

    assert.deepEqual(firstAccount.getBalance("USDT"), {
      asset: "USDT",
      available: 750,
      reserved: 250,
      total: 1000,
    });

    const repository = new TestBalanceRepository(database);
    const persisted = repository.findByAccountAndAsset(
      "reload-account",
      "USDT",
    );

    assert.ok(persisted);
    assert.equal(persisted.available, 750);
    assert.equal(persisted.reserved, 250);

    const reloadedService = createTestBalanceService({ repository });

    assert.deepEqual(
      reloadedService.getTestBalance("reload-account", "USDT"),
      {
        asset: "USDT",
        available: 750,
        reserved: 250,
        total: 1000,
      },
    );
  } finally {
    database.close();
  }
});
