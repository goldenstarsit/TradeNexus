
import path from "node:path";

export const DATABASE_DRIVER =
  process.env.DATABASE_DRIVER === "sqlite"
    ? "sqlite"
    : "sqlite";

export const DATABASE_PATH =
  process.env.DATABASE_PATH ||
  path.join(process.cwd(), "data", "tradenexus.db");
