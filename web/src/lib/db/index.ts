import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";

const DATABASE_PATH = process.env.DATABASE_PATH || "../shared/db/ugc.db";

const fullSchema = { ...schema, ...relations };

type FullSchema = typeof fullSchema;

let _db: ReturnType<typeof drizzle<FullSchema>> | null = null;

export function getDb() {
  if (!_db) {
    const sqlite = new Database(DATABASE_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema: fullSchema });
  }
  return _db;
}
