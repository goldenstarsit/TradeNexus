
import {
  closeDatabase,
  getDatabase,
} from "./databaseManager";
import {
  toDatabaseError,
} from "./databaseError";

export function recoverDatabase(): void {
  try {
    closeDatabase();
    getDatabase().get("SELECT 1 AS value");
  } catch (error) {
    throw toDatabaseError("recovery", error);
  }
}
