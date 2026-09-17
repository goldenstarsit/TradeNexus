import "server-only";

import type { DatabaseAdapter } from "../databaseAdapter";
import { BaseRepository } from "./baseRepository";

export interface SystemMetadata {
  key: string;
  value: string;
  updated_at: string;
}

export class SystemMetadataRepository extends BaseRepository {
  constructor(database: DatabaseAdapter) {
    super(database, "system_metadata", "key");
  }

  set(key: string, value: string): void {
    this.database.run(
      `INSERT INTO system_metadata (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
      [key, value],
    );
  }

  findByKey(key: string): SystemMetadata | undefined {
    return this.findById<SystemMetadata>(key);
  }
}
