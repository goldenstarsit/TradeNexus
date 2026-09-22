import type { DatabaseAdapter } from "../databaseAdapter";
import { BaseRepository } from "./baseRepository";

export interface PersistedTestBalance {
  account_id: string;
  asset: string;
  available: number;
  reserved: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertTestBalanceInput {
  accountId: string;
  asset: string;
  available: number;
  reserved: number;
}

export class TestBalanceRepository extends BaseRepository {
  constructor(database: DatabaseAdapter) {
    super(database, "test_balances", "account_id");
  }

  findByAccountAndAsset(
    accountId: string,
    asset: string,
  ): PersistedTestBalance | undefined {
    return this.database.get<PersistedTestBalance>(
      `SELECT *
       FROM test_balances
       WHERE account_id = ? AND asset = ?
       LIMIT 1`,
      [accountId, asset],
    );
  }

  findByAccount(accountId: string): PersistedTestBalance[] {
    return this.database.all<PersistedTestBalance>(
      `SELECT *
       FROM test_balances
       WHERE account_id = ?
       ORDER BY asset ASC`,
      [accountId],
    );
  }

  upsert(input: UpsertTestBalanceInput): PersistedTestBalance {
    this.database.run(
      `INSERT INTO test_balances (
        account_id,
        asset,
        available,
        reserved
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, asset)
      DO UPDATE SET
        available = excluded.available,
        reserved = excluded.reserved,
        updated_at = CURRENT_TIMESTAMP`,
      [
        input.accountId,
        input.asset,
        input.available,
        input.reserved,
      ],
    );

    const balance = this.findByAccountAndAsset(
      input.accountId,
      input.asset,
    );

    if (!balance) {
      throw new Error(
        `Test balance ${input.accountId}/${input.asset} was saved but could not be loaded`,
      );
    }

    return balance;
  }
}
