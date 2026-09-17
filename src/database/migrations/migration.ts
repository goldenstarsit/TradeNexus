import "server-only";

import type { DatabaseAdapter } from "../databaseAdapter";

export interface Migration {
  id: number;
  name: string;
  up(database: DatabaseAdapter): void;
  down(database: DatabaseAdapter): void;
}
