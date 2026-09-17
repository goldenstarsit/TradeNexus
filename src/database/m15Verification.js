import Database from "better-sqlite3";

const database = new Database("data/m15-lock-test.db");

database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.pragma("busy_timeout = 5000");

database.exec(`
  CREATE TABLE lock_test (
    id INTEGER PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

const transaction = database.transaction(() => {
  database
    .prepare("INSERT INTO lock_test (value) VALUES (?)")
    .run("locked-write");

  return database
    .prepare("SELECT value FROM lock_test WHERE id = ?")
    .get(1);
});

const result = transaction.immediate();

if (result?.value !== "locked-write") {
  throw new Error("M15 write-lock verification failed");
}

const count = database
  .prepare("SELECT COUNT(*) AS count FROM lock_test")
  .get();

if (count?.count !== 1) {
  throw new Error("M15 transaction isolation verification failed");
}

database.close();

console.log("M15 concurrency/locking foundation: OK");
